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
const MAX_CREDENTIAL_BYTES: usize = 32 * 1024;
const MAX_ENCRYPTED_BYTES: usize = 64 * 1024;

#[derive(Clone, Copy)]
enum ProviderSlot {
    OpenAi,
    Gemini,
    Anthropic,
}

impl ProviderSlot {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "openai" => Ok(Self::OpenAi),
            "gemini" => Ok(Self::Gemini),
            "anthropic" => Ok(Self::Anthropic),
            _ => Err("unsupported AI Provider credential slot".to_string()),
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::OpenAi => "openai",
            Self::Gemini => "gemini",
            Self::Anthropic => "anthropic",
        }
    }

    fn file_name(self) -> &'static str {
        match self {
            Self::OpenAi => "openai.dpapi",
            Self::Gemini => "gemini.dpapi",
            Self::Anthropic => "anthropic.dpapi",
        }
    }
}

fn vault_path(base_dir: &Path, slot: ProviderSlot) -> PathBuf {
    base_dir.join("ai-provider-vault").join(slot.file_name())
}

fn validate_credential(credential: &str) -> Result<(), String> {
    if credential.is_empty()
        || credential.len() > MAX_CREDENTIAL_BYTES
        || credential.contains(['\r', '\n'])
    {
        return Err("AI Provider credential has an invalid length or format".to_string());
    }
    Ok(())
}

fn encode_record(slot: ProviderSlot, credential: &str) -> Vec<u8> {
    format!("{VAULT_VERSION}\n{}\n{credential}", slot.label()).into_bytes()
}

fn decode_record(plaintext: Vec<u8>, expected_slot: ProviderSlot) -> Result<String, String> {
    let value = String::from_utf8(plaintext)
        .map_err(|_| "AI Provider vault payload is not valid UTF-8".to_string())?;
    let mut parts = value.splitn(3, '\n');

    let version = parts.next().unwrap_or_default();
    let provider = parts.next().unwrap_or_default();
    let credential = parts.next().unwrap_or_default();

    if version != VAULT_VERSION {
        return Err("unsupported AI Provider vault version".to_string());
    }
    if provider != expected_slot.label() {
        return Err("AI Provider vault slot does not match payload".to_string());
    }
    validate_credential(credential)?;
    Ok(credential.to_string())
}

fn protect(mut plaintext: Vec<u8>) -> Result<Vec<u8>, String> {
    let input_len = u32::try_from(plaintext.len())
        .map_err(|_| "AI Provider vault payload is too large".to_string())?;
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
        return Err("AI Provider vault payload size is invalid".to_string());
    }

    let input_len = u32::try_from(encrypted.len())
        .map_err(|_| "AI Provider vault payload is too large".to_string())?;
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
    .map_err(|error| format!("AI Provider vault replace failed: {error}"))
}

pub fn store(base_dir: &Path, provider: &str, credential: &str) -> Result<(), String> {
    let slot = ProviderSlot::parse(provider)?;
    validate_credential(credential)?;
    let path = vault_path(base_dir, slot);
    let parent = path
        .parent()
        .ok_or_else(|| "AI Provider vault path is invalid".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create AI Provider vault directory: {error}"))?;

    let encrypted = protect(encode_record(slot, credential))?;
    let temp_path = path.with_extension("tmp");

    {
        let mut file = File::create(&temp_path)
            .map_err(|error| format!("failed to create AI Provider vault temp file: {error}"))?;
        file.write_all(&encrypted)
            .map_err(|error| format!("failed to write AI Provider vault temp file: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("failed to flush AI Provider vault temp file: {error}"))?;
    }

    if let Err(error) = replace_file(&temp_path, &path) {
        let _ = fs::remove_file(&temp_path);
        return Err(error);
    }

    Ok(())
}

pub fn load(base_dir: &Path, provider: &str) -> Result<Option<String>, String> {
    let slot = ProviderSlot::parse(provider)?;
    let path = vault_path(base_dir, slot);

    if !path.exists() {
        return Ok(None);
    }

    let encrypted =
        fs::read(&path).map_err(|error| format!("failed to read AI Provider vault: {error}"))?;
    let plaintext = unprotect(encrypted)?;
    decode_record(plaintext, slot).map(Some)
}

pub fn clear(base_dir: &Path, provider: &str) -> Result<(), String> {
    let slot = ProviderSlot::parse(provider)?;
    let path = vault_path(base_dir, slot);

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("failed to clear AI Provider vault: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slots_reject_arbitrary_names() {
        assert!(ProviderSlot::parse("openai").is_ok());
        assert!(ProviderSlot::parse("gemini").is_ok());
        assert!(ProviderSlot::parse("anthropic").is_ok());
        assert!(ProviderSlot::parse("../openai").is_err());
    }

    #[test]
    fn record_round_trip_binds_provider_slot() {
        let encoded = encode_record(ProviderSlot::Gemini, "provider-key-value");
        let credential =
            decode_record(encoded.clone(), ProviderSlot::Gemini).expect("record should decode");
        assert_eq!(credential, "provider-key-value");
        assert!(decode_record(encoded, ProviderSlot::OpenAi).is_err());
    }

    #[test]
    fn record_rejects_newline_injection() {
        assert!(validate_credential("key\nother").is_err());
        assert!(validate_credential("key\rvalue").is_err());
    }

    #[test]
    fn dpapi_file_round_trip_keeps_plaintext_off_disk() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after Unix epoch")
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!(
            "flexikit-ai-provider-vault-test-{}-{unique}",
            std::process::id()
        ));
        let credential = "test-provider-key-value";

        store(&base_dir, "openai", credential).expect("DPAPI store should succeed");

        let encrypted = fs::read(vault_path(&base_dir, ProviderSlot::OpenAi))
            .expect("encrypted vault file should exist");
        assert!(!encrypted
            .windows(credential.as_bytes().len())
            .any(|window| window == credential.as_bytes()));

        let loaded = load(&base_dir, "openai")
            .expect("DPAPI load should succeed")
            .expect("stored credential should exist");
        assert_eq!(loaded, credential);

        clear(&base_dir, "openai").expect("secure credential clear should succeed");
        assert!(load(&base_dir, "openai")
            .expect("cleared vault lookup should succeed")
            .is_none());

        let _ = fs::remove_dir_all(base_dir);
    }
}
