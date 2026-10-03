#[cfg(target_os = "windows")]
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
#[cfg(target_os = "windows")]
use std::{
    collections::HashSet,
    ffi::{c_void, OsStr, OsString},
    fs,
    os::windows::{
        ffi::{OsStrExt, OsStringExt},
        fs::MetadataExt,
    },
    path::PathBuf,
    ptr,
};
#[cfg(target_os = "windows")]
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};
#[cfg(target_os = "windows")]
use windows::Storage::Streams::DataReader;

#[cfg(target_os = "windows")]
use windows::{
    core::GUID,
    Win32::{
        System::Com::CoTaskMemFree,
        UI::Shell::{
            FOLDERID_Desktop, FOLDERID_PublicDesktop, SHGetKnownFolderPath, KF_FLAG_DEFAULT,
        },
    },
};

#[cfg(target_os = "windows")]
type Hwnd = *mut c_void;
#[cfg(target_os = "windows")]
type Handle = *mut c_void;

#[cfg(target_os = "windows")]
const CF_UNICODETEXT: u32 = 13;
#[cfg(target_os = "windows")]
const GMEM_MOVEABLE: u32 = 0x0002;
#[cfg(target_os = "windows")]
const WM_APPCOMMAND: u32 = 0x0319;
#[cfg(target_os = "windows")]
const MAX_CLIPBOARD_CHARS: usize = 1_000_000;
#[cfg(target_os = "windows")]
const MAX_MEDIA_THUMBNAIL_BYTES: u64 = 4 * 1024 * 1024;
#[cfg(target_os = "windows")]
const FILE_ATTRIBUTE_HIDDEN: u32 = 0x0002;
#[cfg(target_os = "windows")]
const FILE_ATTRIBUTE_SYSTEM: u32 = 0x0004;
#[cfg(target_os = "windows")]
const SW_HIDE: i32 = 0;
#[cfg(target_os = "windows")]
const SW_SHOW: i32 = 5;

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn OpenClipboard(owner: Hwnd) -> i32;
    fn CloseClipboard() -> i32;
    fn IsClipboardFormatAvailable(format: u32) -> i32;
    fn GetClipboardData(format: u32) -> Handle;
    fn EmptyClipboard() -> i32;
    fn SetClipboardData(format: u32, memory: Handle) -> Handle;
    fn SendMessageW(hwnd: Hwnd, message: u32, wparam: usize, lparam: isize) -> isize;
    fn FindWindowW(class_name: *const u16, window_name: *const u16) -> Hwnd;
    fn FindWindowExW(
        parent: Hwnd,
        child_after: Hwnd,
        class_name: *const u16,
        window_name: *const u16,
    ) -> Hwnd;
    fn EnumWindows(callback: unsafe extern "system" fn(Hwnd, isize) -> i32, lparam: isize) -> i32;
    fn IsWindow(hwnd: Hwnd) -> i32;
    fn ShowWindow(hwnd: Hwnd, command: i32) -> i32;
}

#[cfg(target_os = "windows")]
#[link(name = "kernel32")]
extern "system" {
    fn GlobalAlloc(flags: u32, bytes: usize) -> Handle;
    fn GlobalLock(memory: Handle) -> *mut c_void;
    fn GlobalUnlock(memory: Handle) -> i32;
    fn GlobalFree(memory: Handle) -> Handle;
}

#[cfg(target_os = "windows")]
struct ClipboardGuard;

#[cfg(target_os = "windows")]
impl ClipboardGuard {
    fn open() -> Result<Self, String> {
        if unsafe { OpenClipboard(ptr::null_mut()) } == 0 {
            Err("clipboard is currently unavailable".to_string())
        } else {
            Ok(Self)
        }
    }
}

#[cfg(target_os = "windows")]
impl Drop for ClipboardGuard {
    fn drop(&mut self) {
        unsafe {
            CloseClipboard();
        }
    }
}

#[cfg(target_os = "windows")]
pub fn read_clipboard_text() -> Result<Option<String>, String> {
    if unsafe { IsClipboardFormatAvailable(CF_UNICODETEXT) } == 0 {
        return Ok(None);
    }

    let _guard = ClipboardGuard::open()?;
    let memory = unsafe { GetClipboardData(CF_UNICODETEXT) };
    if memory.is_null() {
        return Ok(None);
    }

    let pointer = unsafe { GlobalLock(memory) } as *const u16;
    if pointer.is_null() {
        return Err("failed to lock clipboard text".to_string());
    }

    let mut length = 0_usize;
    while length < MAX_CLIPBOARD_CHARS && unsafe { *pointer.add(length) } != 0 {
        length += 1;
    }

    let text = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(pointer, length) });
    unsafe {
        GlobalUnlock(memory);
    }

    Ok(Some(text))
}

#[cfg(target_os = "windows")]
pub fn write_clipboard_text(text: &str) -> Result<(), String> {
    let wide: Vec<u16> = text.encode_utf16().chain(Some(0)).collect();
    let bytes = wide.len() * std::mem::size_of::<u16>();
    let memory = unsafe { GlobalAlloc(GMEM_MOVEABLE, bytes) };
    if memory.is_null() {
        return Err("failed to allocate clipboard memory".to_string());
    }

    let pointer = unsafe { GlobalLock(memory) } as *mut u16;
    if pointer.is_null() {
        unsafe {
            GlobalFree(memory);
        }
        return Err("failed to lock clipboard memory".to_string());
    }

    unsafe {
        std::ptr::copy_nonoverlapping(wide.as_ptr(), pointer, wide.len());
        GlobalUnlock(memory);
    }

    let _guard = match ClipboardGuard::open() {
        Ok(guard) => guard,
        Err(error) => {
            unsafe {
                GlobalFree(memory);
            }
            return Err(error);
        }
    };

    if unsafe { EmptyClipboard() } == 0 {
        unsafe {
            GlobalFree(memory);
        }
        return Err("failed to clear clipboard".to_string());
    }

    if unsafe { SetClipboardData(CF_UNICODETEXT, memory) }.is_null() {
        unsafe {
            GlobalFree(memory);
        }
        return Err("failed to write clipboard text".to_string());
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn wide(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn find_shell_def_view(top: Hwnd, output: isize) -> i32 {
    let class_name = wide("SHELLDLL_DefView");
    let view = FindWindowExW(top, ptr::null_mut(), class_name.as_ptr(), ptr::null());
    if view.is_null() {
        return 1;
    }
    let output = output as *mut Hwnd;
    if !output.is_null() {
        *output = view;
    }
    0
}

#[cfg(target_os = "windows")]
fn desktop_list_view() -> Result<Hwnd, String> {
    let progman_class = wide("Progman");
    let progman = unsafe { FindWindowW(progman_class.as_ptr(), ptr::null()) };
    let shell_class = wide("SHELLDLL_DefView");
    let mut shell_view = if progman.is_null() {
        ptr::null_mut()
    } else {
        unsafe { FindWindowExW(progman, ptr::null_mut(), shell_class.as_ptr(), ptr::null()) }
    };
    if shell_view.is_null() {
        unsafe {
            EnumWindows(find_shell_def_view, &mut shell_view as *mut Hwnd as isize);
        }
    }
    if shell_view.is_null() {
        return Err("Windows desktop icon host is unavailable".to_string());
    }

    let list_class = wide("SysListView32");
    let list = unsafe {
        FindWindowExW(
            shell_view,
            ptr::null_mut(),
            list_class.as_ptr(),
            ptr::null(),
        )
    };
    if list.is_null() || unsafe { IsWindow(list) } == 0 {
        return Err("Windows desktop icon list is unavailable".to_string());
    }
    Ok(list)
}

#[cfg(target_os = "windows")]
pub fn set_desktop_icons_visible(visible: bool) -> Result<(), String> {
    let list = desktop_list_view()?;
    unsafe {
        ShowWindow(list, if visible { SW_SHOW } else { SW_HIDE });
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn known_folder_path(folder_id: &GUID) -> Option<PathBuf> {
    let path =
        unsafe { SHGetKnownFolderPath(folder_id as *const GUID, KF_FLAG_DEFAULT, None) }.ok()?;
    let pointer = path.0;
    if pointer.is_null() {
        return None;
    }

    let mut length = 0_usize;
    while length < 32_768 && unsafe { *pointer.add(length) } != 0 {
        length += 1;
    }

    let result = if length == 0 || length >= 32_768 {
        None
    } else {
        let wide = unsafe { std::slice::from_raw_parts(pointer, length) };
        Some(PathBuf::from(OsString::from_wide(wide)))
    };

    unsafe {
        CoTaskMemFree(Some(pointer as *const c_void));
    }
    result
}

#[cfg(target_os = "windows")]
fn desktop_roots() -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    [&FOLDERID_Desktop, &FOLDERID_PublicDesktop]
        .into_iter()
        .filter_map(known_folder_path)
        .filter_map(|path| path.canonicalize().ok())
        .filter(|path| seen.insert(path.clone()))
        .collect()
}

#[cfg(target_os = "windows")]
pub type DesktopItemSnapshot = (String, String, String, bool, u64);

#[cfg(target_os = "windows")]
fn desktop_search_rank(name: &str, extension: &str, query: &str) -> Option<u8> {
    let name = name.to_lowercase();
    let extension = extension.to_lowercase();
    let extension_query = query.trim_start_matches('.');
    if name == query {
        Some(0)
    } else if name.starts_with(query) {
        Some(1)
    } else if name.contains(query) {
        Some(2)
    } else if !extension_query.is_empty() && extension == extension_query {
        Some(3)
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
pub fn search_desktop_items(query: &str) -> Result<Vec<DesktopItemSnapshot>, String> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let query: String = query.chars().take(120).collect();
    let roots = desktop_roots();
    if roots.is_empty() {
        return Ok(Vec::new());
    }

    let mut stack: Vec<(PathBuf, usize)> = roots.iter().cloned().map(|root| (root, 0)).collect();
    let mut visited_dirs = HashSet::new();
    let mut seen_items = HashSet::new();
    let mut ranked: Vec<(u8, DesktopItemSnapshot)> = Vec::new();
    let mut scanned = 0_usize;

    while let Some((folder, depth)) = stack.pop() {
        if scanned >= 5_000 || !visited_dirs.insert(folder.clone()) {
            continue;
        }
        let entries = match fs::read_dir(&folder) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            if scanned >= 5_000 {
                break;
            }
            scanned += 1;

            let path = entry.path();
            let metadata = match entry.metadata() {
                Ok(value) => value,
                Err(_) => continue,
            };
            let attributes = metadata.file_attributes();
            if attributes & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) != 0 {
                continue;
            }

            let canonical = path.canonicalize().unwrap_or(path);
            if !roots.iter().any(|root| canonical.starts_with(root)) {
                continue;
            }
            let name = entry.file_name().to_string_lossy().trim().to_string();
            if name.is_empty() {
                continue;
            }
            let extension = canonical
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|value| value.as_secs())
                .unwrap_or(0);

            if seen_items.insert(canonical.clone()) {
                if let Some(rank) = desktop_search_rank(&name, &extension, &query) {
                    ranked.push((
                        rank,
                        (
                            canonical.to_string_lossy().to_string(),
                            name,
                            extension,
                            metadata.is_dir(),
                            modified_at,
                        ),
                    ));
                }
            }

            if metadata.is_dir() && depth < 4 && !visited_dirs.contains(&canonical) {
                stack.push((canonical, depth + 1));
            }
        }
    }

    ranked.sort_by(|left, right| {
        left.0
            .cmp(&right.0)
            .then_with(|| right.1 .3.cmp(&left.1 .3))
            .then_with(|| right.1 .4.cmp(&left.1 .4))
            .then_with(|| left.1 .1.to_lowercase().cmp(&right.1 .1.to_lowercase()))
    });
    Ok(ranked.into_iter().take(60).map(|(_, item)| item).collect())
}

#[cfg(target_os = "windows")]
pub fn desktop_items() -> Result<Vec<DesktopItemSnapshot>, String> {
    let roots = desktop_roots();
    if roots.is_empty() {
        return Ok(Vec::new());
    }

    let mut seen = HashSet::new();
    let mut items = Vec::new();
    for root in roots {
        let entries = match fs::read_dir(&root) {
            Ok(entries) => entries,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let metadata = match entry.metadata() {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            let attributes = metadata.file_attributes();
            if attributes & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) != 0 {
                continue;
            }
            let canonical = path.canonicalize().unwrap_or(path);
            if !seen.insert(canonical.clone()) {
                continue;
            }
            let name = entry.file_name().to_string_lossy().trim().to_string();
            if name.is_empty() {
                continue;
            }
            let extension = canonical
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|value| value.as_secs())
                .unwrap_or(0);
            items.push((
                canonical.to_string_lossy().to_string(),
                name,
                extension,
                metadata.is_dir(),
                modified_at,
            ));
        }
    }

    items.sort_by(|left, right| {
        right
            .3
            .cmp(&left.3)
            .then_with(|| left.1.to_lowercase().cmp(&right.1.to_lowercase()))
    });
    Ok(items)
}

#[cfg(target_os = "windows")]
pub fn resolve_desktop_item(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path.trim())
        .canonicalize()
        .map_err(|_| "desktop item does not exist".to_string())?;
    let allowed = desktop_roots()
        .into_iter()
        .any(|root| candidate.starts_with(root));
    if !allowed {
        return Err("desktop item is outside the managed Desktop folders".to_string());
    }
    Ok(candidate)
}

#[cfg(target_os = "windows")]
pub type FolderPreviewSnapshot = (String, String, String, bool, u64);

#[cfg(target_os = "windows")]
pub fn folder_preview(path: &str) -> Result<Vec<FolderPreviewSnapshot>, String> {
    let folder = resolve_desktop_item(path)?;
    if !folder.is_dir() {
        return Err("desktop item is not a folder".to_string());
    }

    let roots = desktop_roots();
    let entries = fs::read_dir(&folder).map_err(|_| "cannot read folder".to_string())?;
    let mut items = Vec::new();
    for entry in entries.flatten().take(512) {
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(value) => value,
            Err(_) => continue,
        };
        let attributes = metadata.file_attributes();
        if attributes & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) != 0 {
            continue;
        }

        let canonical = path.canonicalize().unwrap_or(path);
        if !roots.iter().any(|root| canonical.starts_with(root)) {
            continue;
        }

        let name = entry.file_name().to_string_lossy().trim().to_string();
        if name.is_empty() {
            continue;
        }
        let extension = canonical
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|value| value.as_secs())
            .unwrap_or(0);

        items.push((
            canonical.to_string_lossy().to_string(),
            name,
            extension,
            metadata.is_dir(),
            modified_at,
        ));
    }

    items.sort_by(|left, right| {
        right
            .3
            .cmp(&left.3)
            .then_with(|| left.1.to_lowercase().cmp(&right.1.to_lowercase()))
    });
    Ok(items.into_iter().take(30).collect())
}

#[cfg(target_os = "windows")]
pub type MediaSessionSnapshot = (String, String, String, String, bool, i64, i64);

#[cfg(target_os = "windows")]
pub fn current_media_session() -> Result<Option<MediaSessionSnapshot>, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;

    let session = match manager.GetCurrentSession() {
        Ok(session) => session,
        Err(_) => return Ok(None),
    };

    let properties = session
        .TryGetMediaPropertiesAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;
    let playback = session
        .GetPlaybackInfo()
        .map_err(|error| error.to_string())?;
    let timeline = session
        .GetTimelineProperties()
        .map_err(|error| error.to_string())?;

    let start = timeline
        .StartTime()
        .map_err(|error| error.to_string())?
        .Duration;
    let end = timeline
        .EndTime()
        .map_err(|error| error.to_string())?
        .Duration;
    let position = timeline
        .Position()
        .map_err(|error| error.to_string())?
        .Duration;

    let source_app = session
        .SourceAppUserModelId()
        .map_err(|error| error.to_string())?
        .to_string();
    let title = properties
        .Title()
        .map_err(|error| error.to_string())?
        .to_string();
    let artist = properties
        .Artist()
        .map_err(|error| error.to_string())?
        .to_string();
    let album = properties
        .AlbumTitle()
        .map_err(|error| error.to_string())?
        .to_string();
    let is_playing = playback
        .PlaybackStatus()
        .map_err(|error| error.to_string())?
        == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;

    let position_ms = ((position - start).max(0)) / 10_000;
    let duration_ms = ((end - start).max(0)) / 10_000;

    Ok(Some((
        source_app,
        title,
        artist,
        album,
        is_playing,
        position_ms,
        duration_ms,
    )))
}

#[cfg(target_os = "windows")]
pub fn current_media_thumbnail() -> Result<Option<(String, String)>, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;

    let session = match manager.GetCurrentSession() {
        Ok(session) => session,
        Err(_) => return Ok(None),
    };

    let properties = session
        .TryGetMediaPropertiesAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;

    let thumbnail = match properties.Thumbnail() {
        Ok(thumbnail) => thumbnail,
        Err(_) => return Ok(None),
    };
    let stream = thumbnail
        .OpenReadAsync()
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;

    let size = stream.Size().map_err(|error| error.to_string())?;
    if size == 0 || size > MAX_MEDIA_THUMBNAIL_BYTES {
        return Ok(None);
    }

    let input = stream
        .GetInputStreamAt(0)
        .map_err(|error| error.to_string())?;
    let reader = DataReader::CreateDataReader(&input).map_err(|error| error.to_string())?;
    let loaded = reader
        .LoadAsync(size as u32)
        .map_err(|error| error.to_string())?
        .get()
        .map_err(|error| error.to_string())?;

    if loaded == 0 {
        return Ok(None);
    }

    let mut bytes = vec![0_u8; loaded as usize];
    reader
        .ReadBytes(&mut bytes)
        .map_err(|error| error.to_string())?;

    let content_type = stream
        .ContentType()
        .map(|value| value.to_string())
        .unwrap_or_else(|_| "image/jpeg".to_string());
    let mime = if content_type.starts_with("image/") {
        content_type
    } else {
        "image/jpeg".to_string()
    };

    Ok(Some((mime, BASE64_STANDARD.encode(bytes))))
}

#[cfg(target_os = "windows")]
pub fn media_control(action: &str) -> Result<(), String> {
    let command = match action {
        "previous" => 12_isize,
        "next" => 11_isize,
        "play_pause" => 14_isize,
        "stop" => 13_isize,
        _ => return Err("unsupported media action".to_string()),
    };

    let hwnd_broadcast = 0xffff_usize as Hwnd;
    unsafe {
        SendMessageW(hwnd_broadcast, WM_APPCOMMAND, 0, command << 16);
    }
    Ok(())
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;

    #[test]
    fn resolves_desktop_roots_from_known_folders() {
        let user_desktop = known_folder_path(&FOLDERID_Desktop)
            .expect("Windows Known Folder API did not return the user Desktop");
        let user_desktop = user_desktop
            .canonicalize()
            .expect("resolved user Desktop does not exist");

        let roots = desktop_roots();
        assert!(
            roots.iter().any(|root| root == &user_desktop),
            "desktop_roots did not include the user Known Folder Desktop: {}",
            user_desktop.display()
        );
        assert!(
            roots.iter().all(|root| root.is_dir()),
            "desktop_roots included a non-directory path"
        );
    }

    #[test]
    fn desktop_items_expose_modification_time() {
        let items = desktop_items().expect("desktop item enumeration failed");
        if let Some(item) = items.first() {
            assert!(
                item.4 > 0,
                "real Desktop item did not expose a modification timestamp"
            );
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock is before UNIX epoch")
                .as_secs();
            assert!(
                item.4 <= now + 5,
                "Desktop item modification timestamp is unexpectedly in the future"
            );
        }
    }

    #[test]
    fn desktop_search_rank_prefers_exact_prefix_and_name_contains() {
        assert_eq!(
            desktop_search_rank("report.pdf", "pdf", "report.pdf"),
            Some(0)
        );
        assert_eq!(
            desktop_search_rank("report-final.pdf", "pdf", "report"),
            Some(1)
        );
        assert_eq!(
            desktop_search_rank("my-report.pdf", "pdf", "report"),
            Some(2)
        );
        assert_eq!(desktop_search_rank("notes.pdf", "pdf", ".pdf"), Some(2));
        assert_eq!(desktop_search_rank("notes.txt", "txt", "pdf"), None);
    }

    #[test]
    fn searches_real_desktop_within_known_roots() {
        let items = desktop_items().expect("desktop item enumeration failed");
        let Some(seed) = items.first() else {
            return;
        };
        let results = search_desktop_items(&seed.1).expect("desktop search failed");
        assert!(
            !results.is_empty(),
            "desktop search did not find its seed item"
        );
        assert!(results.len() <= 60, "desktop search exceeded result cap");
        let roots = desktop_roots();
        for item in results {
            let path = PathBuf::from(item.0);
            assert!(
                roots.iter().any(|root| path.starts_with(root)),
                "desktop search escaped managed Desktop roots: {}",
                path.display()
            );
        }
    }

    #[test]
    fn folder_preview_keeps_desktop_scope() {
        let items = desktop_items().expect("desktop items failed");
        if let Some(folder) = items.iter().find(|item| item.3) {
            let preview = folder_preview(&folder.0).expect("folder preview failed");
            assert!(preview.len() <= 30);
        }
    }

    #[test]
    fn previews_real_desktop_folder_within_known_roots() {
        let desktop = known_folder_path(&FOLDERID_Desktop)
            .expect("Windows Known Folder API did not return the user Desktop");
        let desktop = desktop
            .canonicalize()
            .expect("resolved user Desktop does not exist");
        let preview =
            folder_preview(&desktop.to_string_lossy()).expect("real Desktop folder preview failed");
        let roots = desktop_roots();

        assert!(
            preview.len() <= 30,
            "folder preview exceeded the 30-item cap"
        );
        for item in preview {
            let path = PathBuf::from(item.0);
            assert!(
                roots.iter().any(|root| path.starts_with(root)),
                "folder preview escaped managed Desktop roots: {}",
                path.display()
            );
        }
    }

    #[test]
    fn extracts_real_desktop_shell_icon() {
        let candidate = desktop_items()
            .ok()
            .and_then(|items| items.into_iter().next())
            .map(|item| PathBuf::from(item.0))
            .or_else(|| known_folder_path(&FOLDERID_Desktop))
            .expect("no real Desktop path available for icon validation");

        let icon = crate::installed_apps_windows::shell_icon_data_url_for_path(&candidate)
            .expect("Windows Shell did not return an icon for a real Desktop path");
        assert!(
            icon.starts_with("data:image/png;base64,"),
            "unexpected Desktop icon payload"
        );
    }
}
