use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Once,
    time::{SystemTime, UNIX_EPOCH},
};

const LOG_DIR_NAME: &str = "com.flexikit.desktop";
const LOG_FILE_NAME: &str = "flexikit.log";
const MAX_LOG_BYTES: u64 = 2 * 1024 * 1024;
const MAX_BACKUPS: usize = 3;

static INIT: Once = Once::new();

pub fn init() {
    INIT.call_once(|| {
        rotate_if_needed();
        std::panic::set_hook(Box::new(|info| {
            let location = info
                .location()
                .map(|value| format!("{}:{}:{}", value.file(), value.line(), value.column()))
                .unwrap_or_else(|| "unknown".to_string());
            let message = if let Some(value) = info.payload().downcast_ref::<&str>() {
                (*value).to_string()
            } else if let Some(value) = info.payload().downcast_ref::<String>() {
                value.clone()
            } else {
                "non-string panic payload".to_string()
            };
            log_event("panic", &format!("location={location} message={message}"));
        }));

        log_event(
            "startup",
            &format!(
                "version={} os={} arch={} pid={}",
                env!("CARGO_PKG_VERSION"),
                std::env::consts::OS,
                std::env::consts::ARCH,
                std::process::id()
            ),
        );
    });
}

pub fn log_event(event: &str, detail: &str) {
    let Some(path) = log_file_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        if fs::create_dir_all(parent).is_err() {
            return;
        }
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or_default();
    let sanitized = detail.replace(['\r', '\n'], " ");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{timestamp}\t{event}\t{sanitized}");
    }
}

pub fn log_file_path() -> Option<PathBuf> {
    log_root().map(|root| root.join("logs").join(LOG_FILE_NAME))
}

fn log_root() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .map(|path| path.join(LOG_DIR_NAME));
    }

    #[cfg(target_os = "macos")]
    {
        return std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join("Library").join("Logs").join(LOG_DIR_NAME));
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        if let Some(path) = std::env::var_os("XDG_STATE_HOME") {
            return Some(PathBuf::from(path).join(LOG_DIR_NAME));
        }
        return std::env::var_os("HOME")
            .map(PathBuf::from)
            .map(|path| path.join(".local").join("state").join(LOG_DIR_NAME));
    }

    #[allow(unreachable_code)]
    Some(std::env::temp_dir().join("flexikit"))
}

fn rotate_if_needed() {
    let Some(path) = log_file_path() else {
        return;
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return;
    };
    if metadata.len() < MAX_LOG_BYTES {
        return;
    }

    for index in (1..=MAX_BACKUPS).rev() {
        let destination = path.with_file_name(format!("{LOG_FILE_NAME}.{index}"));
        if index == MAX_BACKUPS {
            let _ = fs::remove_file(&destination);
        }
        let source = if index == 1 {
            path.clone()
        } else {
            path.with_file_name(format!("{LOG_FILE_NAME}.{}", index - 1))
        };
        if source.exists() {
            let _ = fs::rename(source, destination);
        }
    }
}
