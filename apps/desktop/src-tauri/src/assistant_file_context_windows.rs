use std::{ffi::c_void, fs::File, io::Read, path::Path};

use windows::Win32::{
    System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    },
    UI::Shell::{
        FileOpenDialog, IFileOpenDialog, FOS_FILEMUSTEXIST, FOS_FORCEFILESYSTEM, FOS_PATHMUSTEXIST,
        SIGDN_FILESYSPATH,
    },
};

const MAX_FILE_BYTES: usize = 32 * 1024;
const CANCELLED_HRESULT: i32 = 0x8007_04C7u32 as i32;

pub type AssistantFileSelection = (String, String, String);

struct ComApartment;

impl Drop for ComApartment {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

fn initialize_sta() -> Result<ComApartment, String> {
    let result = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    if result.is_err() {
        return Err("failed to initialize the Windows file picker".to_string());
    }
    Ok(ComApartment)
}

fn is_supported_extension(extension: &str) -> bool {
    matches!(
        extension,
        "txt"
            | "md"
            | "markdown"
            | "json"
            | "yaml"
            | "yml"
            | "toml"
            | "csv"
            | "log"
            | "xml"
            | "html"
            | "htm"
            | "css"
            | "js"
            | "jsx"
            | "ts"
            | "tsx"
            | "vue"
            | "py"
            | "rs"
            | "c"
            | "h"
            | "cpp"
            | "hpp"
            | "cc"
            | "java"
            | "kt"
            | "kts"
            | "go"
            | "sql"
            | "sh"
            | "bash"
            | "zsh"
            | "ps1"
            | "bat"
            | "cmd"
    )
}

fn validate_text_payload(
    file_name: String,
    extension: String,
    bytes: Vec<u8>,
) -> Result<AssistantFileSelection, String> {
    if file_name.is_empty() || file_name.chars().count() > 255 {
        return Err("selected file name is invalid".to_string());
    }
    if !is_supported_extension(&extension) {
        return Err("selected file type is not supported for AI context".to_string());
    }
    if bytes.is_empty() {
        return Err("selected file is empty".to_string());
    }
    if bytes.len() > MAX_FILE_BYTES {
        return Err("selected file exceeds the 32 KiB AI context limit".to_string());
    }
    if bytes.contains(&0) {
        return Err("selected file appears to be binary".to_string());
    }

    let content =
        String::from_utf8(bytes).map_err(|_| "selected file must be UTF-8 text".to_string())?;
    if content.trim().is_empty() {
        return Err("selected file contains no readable text".to_string());
    }
    if content
        .chars()
        .any(|value| value.is_control() && !matches!(value, '\n' | '\r' | '\t'))
    {
        return Err("selected file contains unsupported control characters".to_string());
    }

    Ok((file_name, extension, content))
}

fn read_authorized_text_file(path: &Path) -> Result<AssistantFileSelection, String> {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "selected file name is not valid UTF-8".to_string())?
        .to_string();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "selected file type is not supported for AI context".to_string())?;

    if !is_supported_extension(&extension) {
        return Err("selected file type is not supported for AI context".to_string());
    }

    let file = File::open(path).map_err(|_| "failed to open the selected file".to_string())?;
    let metadata = file
        .metadata()
        .map_err(|_| "failed to inspect the selected file".to_string())?;
    if !metadata.is_file() {
        return Err("the selected item must be a file".to_string());
    }
    if metadata.len() > MAX_FILE_BYTES as u64 {
        return Err("selected file exceeds the 32 KiB AI context limit".to_string());
    }

    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    file.take((MAX_FILE_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| "failed to read the selected file".to_string())?;

    validate_text_payload(file_name, extension, bytes)
}

fn pick_text_file_sta() -> Result<Option<AssistantFileSelection>, String> {
    let _apartment = initialize_sta()?;
    let dialog: IFileOpenDialog =
        unsafe { CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER) }
            .map_err(|_| "failed to create the Windows file picker".to_string())?;

    let options = unsafe { dialog.GetOptions() }
        .map_err(|_| "failed to configure the Windows file picker".to_string())?;
    unsafe {
        dialog
            .SetOptions(options | FOS_FORCEFILESYSTEM | FOS_FILEMUSTEXIST | FOS_PATHMUSTEXIST)
            .map_err(|_| "failed to configure the Windows file picker".to_string())?;
    }

    if let Err(error) = unsafe { dialog.Show(None) } {
        if error.code().0 == CANCELLED_HRESULT {
            return Ok(None);
        }
        return Err("Windows file picker failed".to_string());
    }

    let item = unsafe { dialog.GetResult() }
        .map_err(|_| "failed to read the selected file".to_string())?;
    let raw_path = unsafe { item.GetDisplayName(SIGDN_FILESYSPATH) }
        .map_err(|_| "failed to resolve the selected file".to_string())?;
    let path_result = unsafe { raw_path.to_string() }
        .map_err(|_| "selected file path is not valid Unicode".to_string());
    unsafe {
        CoTaskMemFree(Some(raw_path.0.cast::<c_void>()));
    }
    let path = path_result?;

    read_authorized_text_file(Path::new(&path)).map(Some)
}

pub fn pick_text_file() -> Result<Option<AssistantFileSelection>, String> {
    std::thread::spawn(pick_text_file_sta)
        .join()
        .map_err(|_| "Windows file picker thread failed".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supported_extensions_exclude_secret_and_binary_formats() {
        assert!(is_supported_extension("md"));
        assert!(is_supported_extension("ts"));
        assert!(is_supported_extension("rs"));
        assert!(!is_supported_extension("env"));
        assert!(!is_supported_extension("pem"));
        assert!(!is_supported_extension("key"));
        assert!(!is_supported_extension("exe"));
        assert!(!is_supported_extension("pdf"));
    }

    #[test]
    fn text_payload_never_contains_a_path_field() {
        let selection = validate_text_payload(
            "notes.md".to_string(),
            "md".to_string(),
            b"hello\nworld".to_vec(),
        )
        .expect("valid text should be accepted");
        assert_eq!(selection.0, "notes.md");
        assert_eq!(selection.1, "md");
        assert_eq!(selection.2, "hello\nworld");
    }

    #[test]
    fn text_payload_rejects_binary_invalid_utf8_and_oversize_content() {
        assert!(validate_text_payload(
            "binary.txt".to_string(),
            "txt".to_string(),
            b"a\0b".to_vec(),
        )
        .is_err());
        assert!(validate_text_payload(
            "invalid.txt".to_string(),
            "txt".to_string(),
            vec![0xff, 0xfe],
        )
        .is_err());
        assert!(validate_text_payload(
            "large.txt".to_string(),
            "txt".to_string(),
            vec![b'a'; MAX_FILE_BYTES + 1],
        )
        .is_err());
    }
}
