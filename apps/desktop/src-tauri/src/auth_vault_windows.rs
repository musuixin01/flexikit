use std::{
    ffi::c_void,
    fs::{self, File},
    io::Write,
    os::windows::ffi::OsStrExt,
    path::{Path, PathBuf},
    slice,
};

use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::{LocalFree, HLOCAL},
        Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
        Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
    },
};

const VAULT_VERSION: &str = "v1";
const MAX_TOKEN_BYTES: usize = 32 * 1024;
const MAX_EXPIRES_AT_BYTES: usize = 128;
const MAX_ENCRYPTED_BYTES: usize = 64 * 1024;

#[derive(Clone, Copy)]
enum TokenSlot {
    Access,
    Refresh,
}

impl TokenSlot {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "access" => Ok(Self::Access),
            "refresh" => Ok(Self::Refresh),
            _ => Err("unsupported secure token slot".to_string()),
        }
    }

    fn file_name(self) -> &'static str {
        match self {
            Self::Access => "access.dpapi",
            Self::Refresh => "refresh.dpapi",
        }
    }
}

fn vault_path(base_dir: &Path, slot: TokenSlot) -> PathBuf {
    base_dir.join("auth-vault").join(slot.file_name())
}

fn validate_record(token: &str, expires_at: &str) -> Result<(), String> {
    if token.is_empty() || token.len() > MAX_TOKEN_BYTES || token.contains(['\r', '\n']) {
        return Err("secure token has an invalid length or format".to_string());
    }
    if expires_at.is_empty()
        || expires_at.len() > MAX_EXPIRES_AT_BYTES
        || expires_at.contains(['\r', '\n'])
    {
        return Err("secure token expiry has an invalid length or format".to_string());
    }
    Ok(())
}

fn encode_record(token: &str, expires_at: &str) -> Vec<u8> {
    format!("{VAULT_VERSION}\n{expires_at}\n{token}").into_bytes()
}

fn decode_record(plaintext: Vec<u8>) -> Result<(String, String), String> {
    let value = String::from_utf8(plaintext)
        .map_err(|_| "secure token payload is not valid UTF-8".to_string())?;
    let mut parts = value.splitn(3, '\n');

    let version = parts.next().unwrap_or_default();
    let expires_at = parts.next().unwrap_or_default();
    let token = parts.next().unwrap_or_default();

    if version != VAULT_VERSION {
        return Err("unsupported secure token vault version".to_string());
    }
    validate_record(token, expires_at)?;
    Ok((token.to_string(), expires_at.to_string()))
}

fn protect(mut plaintext: Vec<u8>) -> Result<Vec<u8>, String> {
    let input_len = u32::try_from(plaintext.len())
        .map_err(|_| "secure token payload is too large".to_string())?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_len,
        pbData: plaintext.as_mut_ptr(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();

    let result = unsafe {
        CryptProtectData(
            &input,
            PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    plaintext.fill(0);
    result.map_err(|error| format!("DPAPI protect failed: {error}"))?;

    if output.pbData.is_null() || output.cbData == 0 {
        return Err("DPAPI returned an empty protected payload".to_string());
    }

    let encrypted =
        unsafe { slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        let _ = LocalFree(Some(HLOCAL(output.pbData as *mut c_void)));
    }
    Ok(encrypted)
}

fn unprotect(mut encrypted: Vec<u8>) -> Result<Vec<u8>, String> {
    if encrypted.is_empty() || encrypted.len() > MAX_ENCRYPTED_BYTES {
        return Err("secure token vault payload size is invalid".to_string());
    }

    let input_len = u32::try_from(encrypted.len())
        .map_err(|_| "secure token vault payload is too large".to_string())?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: input_len,
        pbData: encrypted.as_mut_ptr(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();

    let result = unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };
    encrypted.fill(0);
    result.map_err(|error| format!("DPAPI unprotect failed: {error}"))?;

    if output.pbData.is_null() || output.cbData == 0 {
        return Err("DPAPI returned an empty unprotected payload".to_string());
    }

    let plaintext =
        unsafe { slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        let _ = LocalFree(Some(HLOCAL(output.pbData as *mut c_void)));
    }
    Ok(plaintext)
}

fn path_as_pcwstr(path: &Path) -> Vec<u16> {
    path.as_os_str().encode_wide().chain(Some(0)).collect()
}

fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    let source_wide = path_as_pcwstr(source);
    let destination_wide = path_as_pcwstr(destination);

    unsafe {
        MoveFileExW(
            PCWSTR(source_wide.as_ptr()),
            PCWSTR(destination_wide.as_ptr()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    }
    .map_err(|error| format!("secure token vault replace failed: {error}"))
}

pub fn store(base_dir: &Path, slot: &str, token: &str, expires_at: &str) -> Result<(), String> {
    validate_record(token, expires_at)?;
    let slot = TokenSlot::parse(slot)?;
    let path = vault_path(base_dir, slot);
    let parent = path
        .parent()
        .ok_or_else(|| "secure token vault path is invalid".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create secure token vault directory: {error}"))?;

    let encrypted = protect(encode_record(token, expires_at))?;
    let temp_path = path.with_extension("tmp");

    {
        let mut file = File::create(&temp_path)
            .map_err(|error| format!("failed to create secure token temp file: {error}"))?;
        file.write_all(&encrypted)
            .map_err(|error| format!("failed to write secure token temp file: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("failed to flush secure token temp file: {error}"))?;
    }

    if let Err(error) = replace_file(&temp_path, &path) {
        let _ = fs::remove_file(&temp_path);
        return Err(error);
    }

    Ok(())
}

pub fn load(base_dir: &Path, slot: &str) -> Result<Option<(String, String)>, String> {
    let slot = TokenSlot::parse(slot)?;
    let path = vault_path(base_dir, slot);

    if !path.exists() {
        return Ok(None);
    }

    let encrypted =
        fs::read(&path).map_err(|error| format!("failed to read secure token vault: {error}"))?;
    let plaintext = unprotect(encrypted)?;
    decode_record(plaintext).map(Some)
}

pub fn clear(base_dir: &Path, slot: &str) -> Result<(), String> {
    let slot = TokenSlot::parse(slot)?;
    let path = vault_path(base_dir, slot);

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("failed to clear secure token vault: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slots_reject_arbitrary_names() {
        assert!(TokenSlot::parse("access").is_ok());
        assert!(TokenSlot::parse("refresh").is_ok());
        assert!(TokenSlot::parse("../token").is_err());
    }

    #[test]
    fn record_round_trip_is_strict() {
        let encoded = encode_record("token-value", "2026-10-25T00:00:00.000Z");
        let (token, expires_at) = decode_record(encoded).expect("record should decode");
        assert_eq!(token, "token-value");
        assert_eq!(expires_at, "2026-10-25T00:00:00.000Z");
    }

    #[test]
    fn record_rejects_newline_injection() {
        assert!(validate_record("token\nother", "2026-10-25T00:00:00.000Z").is_err());
        assert!(validate_record("token", "date\rvalue").is_err());
    }

    #[test]
    fn dpapi_file_round_trip_keeps_plaintext_off_disk() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after Unix epoch")
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!(
            "flexikit-secure-token-test-{}-{unique}",
            std::process::id()
        ));
        let token = "test-access-token-value";
        let expires_at = "2026-10-25T00:00:00.000Z";

        store(&base_dir, "access", token, expires_at).expect("DPAPI store should succeed");

        let encrypted = fs::read(vault_path(&base_dir, TokenSlot::Access))
            .expect("encrypted vault file should exist");
        assert!(!encrypted
            .windows(token.as_bytes().len())
            .any(|window| window == token.as_bytes()));

        let loaded = load(&base_dir, "access")
            .expect("DPAPI load should succeed")
            .expect("stored token should exist");
        assert_eq!(loaded, (token.to_string(), expires_at.to_string()));

        clear(&base_dir, "access").expect("secure token clear should succeed");
        assert!(load(&base_dir, "access")
            .expect("cleared vault lookup should succeed")
            .is_none());

        let _ = fs::remove_dir_all(base_dir);
    }
}
