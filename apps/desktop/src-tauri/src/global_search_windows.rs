#[cfg(target_os = "windows")]
use std::{
    collections::HashSet,
    ffi::c_void,
    fs,
    os::windows::fs::MetadataExt,
    path::{Path, PathBuf},
    ptr,
    sync::{Mutex, OnceLock},
    thread,
    time::{Duration, Instant},
};
#[cfg(target_os = "windows")]
use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use crate::diagnostics;

#[cfg(target_os = "windows")]
pub type SearchItemSnapshot = (String, String, String, String);

#[cfg(target_os = "windows")]
const FILE_ATTRIBUTE_HIDDEN: u32 = 0x0002;
#[cfg(target_os = "windows")]
const FILE_ATTRIBUTE_SYSTEM: u32 = 0x0004;
#[cfg(target_os = "windows")]
const MAX_INDEX_ITEMS: usize = 24_000;
#[cfg(target_os = "windows")]
const MAX_FILE_DEPTH: usize = 4;
#[cfg(target_os = "windows")]
const INDEX_TTL: Duration = Duration::from_secs(120);

#[cfg(target_os = "windows")]
struct SearchIndex {
    built_at: Instant,
    items: Vec<SearchItemSnapshot>,
}

#[cfg(target_os = "windows")]
static SEARCH_INDEX: OnceLock<Mutex<Option<SearchIndex>>> = OnceLock::new();

#[cfg(target_os = "windows")]
fn search_cache() -> &'static Mutex<Option<SearchIndex>> {
    SEARCH_INDEX.get_or_init(|| Mutex::new(None))
}

#[cfg(target_os = "windows")]
fn canonical_unique(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    paths
        .into_iter()
        .filter_map(|path| path.canonicalize().ok())
        .filter(|path| seen.insert(path.clone()))
        .collect()
}

#[cfg(target_os = "windows")]
fn app_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(app_data) = std::env::var("APPDATA") {
        roots.push(PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    if let Ok(program_data) = std::env::var("PROGRAMDATA") {
        roots.push(PathBuf::from(program_data).join("Microsoft\\Windows\\Start Menu\\Programs"));
    }
    for key in ["USERPROFILE", "PUBLIC"] {
        if let Ok(base) = std::env::var(key) {
            roots.push(PathBuf::from(base).join("Desktop"));
        }
    }
    canonical_unique(roots)
}

#[cfg(target_os = "windows")]
fn file_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    for key in ["USERPROFILE", "OneDrive", "OneDriveConsumer"] {
        if let Ok(base) = std::env::var(key) {
            let base = PathBuf::from(base);
            roots.push(base.join("Desktop"));
            roots.push(base.join("Documents"));
            roots.push(base.join("Downloads"));
        }
    }
    canonical_unique(roots)
}

#[cfg(target_os = "windows")]
fn visible(metadata: &fs::Metadata) -> bool {
    metadata.file_attributes() & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM) == 0
}

#[cfg(target_os = "windows")]
fn display_name(path: &Path) -> String {
    let fallback = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    if path.is_dir() {
        return fallback;
    }
    path.file_stem()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
}

#[cfg(target_os = "windows")]
fn scan_apps(items: &mut Vec<SearchItemSnapshot>, seen: &mut HashSet<PathBuf>) {
    let mut queue: Vec<(PathBuf, usize)> = app_roots().into_iter().map(|root| (root, 0)).collect();
    while let Some((root, depth)) = queue.pop() {
        if items.len() >= MAX_INDEX_ITEMS || depth > 6 {
            continue;
        }
        let Ok(entries) = fs::read_dir(root) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let Ok(metadata) = entry.metadata() else {
                continue;
            };
            if !visible(&metadata) {
                continue;
            }
            if metadata.is_dir() {
                queue.push((path, depth + 1));
                continue;
            }
            let extension = path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_ascii_lowercase();
            if !matches!(extension.as_str(), "lnk" | "url" | "exe") {
                continue;
            }
            let canonical = path.canonicalize().unwrap_or(path);
            if !seen.insert(canonical.clone()) {
                continue;
            }
            let parent = canonical
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            items.push((
                "app".to_string(),
                display_name(&canonical),
                canonical.to_string_lossy().to_string(),
                parent,
            ));
        }
    }
}

#[cfg(target_os = "windows")]
fn scan_files(items: &mut Vec<SearchItemSnapshot>, seen: &mut HashSet<PathBuf>) {
    let mut queue: Vec<(PathBuf, usize)> = file_roots().into_iter().map(|root| (root, 0)).collect();
    while let Some((root, depth)) = queue.pop() {
        if items.len() >= MAX_INDEX_ITEMS || depth > MAX_FILE_DEPTH {
            continue;
        }
        let Ok(entries) = fs::read_dir(root) else {
            continue;
        };
        for entry in entries.flatten() {
            if items.len() >= MAX_INDEX_ITEMS {
                break;
            }
            let path = entry.path();
            let Ok(metadata) = entry.metadata() else {
                continue;
            };
            if !visible(&metadata) {
                continue;
            }
            let canonical = path.canonicalize().unwrap_or(path);
            if metadata.is_dir() && depth < MAX_FILE_DEPTH {
                queue.push((canonical.clone(), depth + 1));
            }
            if !seen.insert(canonical.clone()) {
                continue;
            }
            let parent = canonical
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            items.push((
                if metadata.is_dir() { "folder" } else { "file" }.to_string(),
                display_name(&canonical),
                canonical.to_string_lossy().to_string(),
                parent,
            ));
        }
    }
}

#[cfg(target_os = "windows")]
fn build_index() -> Vec<SearchItemSnapshot> {
    let mut items = Vec::new();
    let mut seen = HashSet::new();
    scan_apps(&mut items, &mut seen);
    scan_files(&mut items, &mut seen);
    items
}

#[cfg(target_os = "windows")]
fn refresh_index_if_needed(cache: &mut Option<SearchIndex>) {
    let stale = cache
        .as_ref()
        .map(|index| index.built_at.elapsed() >= INDEX_TTL)
        .unwrap_or(true);
    if stale {
        *cache = Some(SearchIndex {
            built_at: Instant::now(),
            items: build_index(),
        });
    }
}

#[cfg(target_os = "windows")]
pub fn spawn_index_warmup() {
    thread::spawn(|| {
        thread::sleep(Duration::from_secs(2));
        if let Ok(mut cache) = search_cache().lock() {
            refresh_index_if_needed(&mut cache);
        }
    });
}

#[cfg(target_os = "windows")]
fn with_index<T>(handler: impl FnOnce(&[SearchItemSnapshot]) -> T) -> Result<T, String> {
    let mut cache = search_cache().lock().map_err(|error| error.to_string())?;
    refresh_index_if_needed(&mut cache);
    Ok(handler(
        cache
            .as_ref()
            .map(|index| index.items.as_slice())
            .unwrap_or_default(),
    ))
}

#[cfg(target_os = "windows")]
fn item_score(item: &SearchItemSnapshot, keyword: &str) -> i32 {
    let name = item.1.to_lowercase();
    let detail = item.3.to_lowercase();
    let mut score = if name == keyword {
        120
    } else if name.starts_with(keyword) {
        100
    } else if name.contains(keyword) {
        78
    } else if detail.contains(keyword) {
        38
    } else {
        0
    };
    if item.0 == "app" {
        score += 14;
    } else if item.0 == "folder" {
        score += 4;
    }
    score
}

#[cfg(target_os = "windows")]
pub fn search(query: &str, limit: usize) -> Result<Vec<SearchItemSnapshot>, String> {
    let keyword = query.trim().to_lowercase();
    if keyword.is_empty() {
        return Ok(Vec::new());
    }
    let mut matched = with_index(|items| {
        items
            .iter()
            .filter_map(|item| {
                let score = item_score(item, &keyword);
                (score > 0).then_some((score, item.clone()))
            })
            .collect::<Vec<_>>()
    })?;
    matched.sort_by(|left, right| {
        right
            .0
            .cmp(&left.0)
            .then_with(|| left.1 .1.to_lowercase().cmp(&right.1 .1.to_lowercase()))
    });
    Ok(matched
        .into_iter()
        .take(limit.clamp(1, 40))
        .map(|(_, item)| item)
        .collect())
}

#[cfg(target_os = "windows")]
pub fn resolve_allowed_item(path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path.trim())
        .canonicalize()
        .map_err(|_| "search result does not exist".to_string())?;
    let allowed = app_roots()
        .into_iter()
        .chain(file_roots())
        .any(|root| candidate.starts_with(root));
    if !allowed {
        return Err("search result is outside allowed user locations".to_string());
    }
    Ok(candidate)
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct Point {
    x: i32,
    y: i32,
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct Message {
    hwnd: *mut c_void,
    message: u32,
    w_param: usize,
    l_param: isize,
    time: u32,
    point: Point,
    private: u32,
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn RegisterHotKey(hwnd: *mut c_void, id: i32, modifiers: u32, virtual_key: u32) -> i32;
    fn GetMessageW(message: *mut Message, hwnd: *mut c_void, min: u32, max: u32) -> i32;
}

#[cfg(target_os = "windows")]
pub fn spawn_shortcut(app: AppHandle) {
    const HOTKEY_ID: i32 = 0x464b;
    const MOD_CONTROL: u32 = 0x0002;
    const MOD_SHIFT: u32 = 0x0004;
    const MOD_NOREPEAT: u32 = 0x4000;
    const VK_SPACE: u32 = 0x20;
    const WM_HOTKEY: u32 = 0x0312;

    thread::spawn(move || unsafe {
        if RegisterHotKey(
            ptr::null_mut(),
            HOTKEY_ID,
            MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT,
            VK_SPACE,
        ) == 0
        {
            diagnostics::log_event(
                "global_search_shortcut_failed",
                "Ctrl+Shift+Space could not be registered",
            );
            return;
        }

        diagnostics::log_event(
            "global_search_shortcut_ready",
            "Ctrl+Shift+Space registered",
        );

        let mut message = std::mem::zeroed::<Message>();
        while GetMessageW(&mut message, ptr::null_mut(), 0, 0) > 0 {
            if message.message != WM_HOTKEY || message.w_param != HOTKEY_ID as usize {
                continue;
            }
            diagnostics::log_event(
                "global_search_shortcut_triggered",
                "Ctrl+Shift+Space received",
            );
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.unminimize();
                let _ = main.set_focus();
                let _ = main
                    .eval("window.dispatchEvent(new CustomEvent('flexikit-global-search-open'))");
            }
        }
    });
}
