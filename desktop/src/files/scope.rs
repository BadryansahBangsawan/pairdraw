//! Paths a document write must not land in.
//!
//! The fs plugin's scope denies directories where a written file would run, and `fs:deny-default`
//! denies the webview's data. This command does not ask that scope, so the same places are refused
//! here. The webview entries are the paths in tauri-plugin-fs `deny-webview-data` (Linux and
//! Windows); they are refused on every platform, which is stricter than the plugin and keeps the
//! check testable where those platforms are not the host.

use std::fs;
use std::io::{self, ErrorKind};
use std::path::{Component, Path, PathBuf};

/// The bundle id `desktop/tauri.conf.json` names. `$APPLOCALDATA` is the local data directory
/// plus this id (`tauri::path::PathResolver::app_local_data_dir`).
pub(super) const BUNDLE_IDENTIFIER: &str = "engineer.badry.pairdraw";

/// Names inside `$APPLOCALDATA` that `fs:deny-default` refuses. Directory entries cover the
/// directory and everything inside it; `cookies` and `hsts-storage.sqlite` are files there.
const WEBVIEW_DATA: &[&str] = &[
    "CacheStorage",
    "cookies",
    "hsts-storage.sqlite",
    "serviceworkers",
    "WebKitCache",
    "databases",
    "localstorage",
    "mediakeys",
    "storage",
    "EBWebView",
];

pub(super) struct WriteRoots {
    pub(super) home: PathBuf,
    pub(super) data: PathBuf,
    pub(super) local_data: PathBuf,
    pub(super) document: PathBuf,
    pub(super) runtime: Option<PathBuf>,
}

fn env_path(key: &str) -> Option<PathBuf> {
    std::env::var_os(key)
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

fn data_dir(home: &Path) -> PathBuf {
    if cfg!(target_os = "macos") {
        home.join("Library/Application Support")
    } else if cfg!(windows) {
        env_path("APPDATA").unwrap_or_else(|| home.join("AppData/Roaming"))
    } else {
        env_path("XDG_DATA_HOME").unwrap_or_else(|| home.join(".local/share"))
    }
}

fn local_data_dir(home: &Path, data: &Path) -> PathBuf {
    if cfg!(windows) {
        env_path("LOCALAPPDATA").unwrap_or_else(|| home.join("AppData/Local"))
    } else {
        data.to_path_buf()
    }
}

pub(super) fn system_roots() -> io::Result<WriteRoots> {
    let home = env_path("HOME")
        .or_else(|| env_path("USERPROFILE"))
        .ok_or_else(|| io::Error::new(ErrorKind::NotFound, "The home directory is not set."))?;
    let data = data_dir(&home);
    let local_data = local_data_dir(&home, &data);
    Ok(WriteRoots {
        document: home.join("Documents"),
        runtime: env_path("XDG_RUNTIME_DIR"),
        home,
        data,
        local_data,
    })
}

fn has_hidden_component(path: &Path) -> bool {
    path.components().any(|component| match component {
        Component::Normal(part) => part.as_encoded_bytes().first() == Some(&b'.'),
        _ => false,
    })
}

fn is_within(root: &Path, path: &Path) -> bool {
    path == root || path.starts_with(root)
}

fn denied_directories(roots: &WriteRoots) -> Vec<PathBuf> {
    vec![
        roots.home.join("Library/LaunchAgents"),
        roots.home.join("bin"),
        roots.home.join("n"),
        roots.home.join("scoop"),
        PathBuf::from("/usr/local"),
        PathBuf::from("/opt/homebrew"),
        roots
            .data
            .join("Microsoft/Windows/Start Menu/Programs/Startup"),
        roots.document.join("PowerShell"),
        roots.document.join("WindowsPowerShell"),
        roots.data.join("npm"),
        roots.data.join("nvm"),
        roots.data.join("fnm"),
        roots.local_data.join("Volta"),
        roots.local_data.join("Programs"),
        roots.local_data.join("Microsoft/WindowsApps"),
    ]
}

fn is_webview_data(path: &Path, roots: &WriteRoots) -> bool {
    let root = normalized(&roots.local_data.join(BUNDLE_IDENTIFIER));
    WEBVIEW_DATA
        .iter()
        .any(|entry| is_within(&root.join(entry), path))
}

fn is_discovery_file(path: &Path, roots: &WriteRoots) -> bool {
    let path = normalized(path);
    let mut denied = vec![
        roots
            .home
            .join("Library/Application Support/Pairdraw/mcp.json"),
        roots.local_data.join("Pairdraw/mcp.json"),
        roots.home.join(".pairdraw/mcp.json"),
    ];
    if let Some(runtime) = &roots.runtime {
        denied.push(runtime.join("pairdraw/mcp.json"));
    }
    denied.iter().any(|candidate| normalized(candidate) == path)
}

/// The path canonicalized from the nearest existing ancestor.
///
/// `/var` on macOS is a symlink to `/private/var`. A prefix check has to use one spelling, or a
/// link into a refused directory compares unequal and the write is allowed.
fn normalized(path: &Path) -> PathBuf {
    let mut pending = Vec::new();
    let mut current = path.to_path_buf();
    loop {
        if let Ok(real) = fs::canonicalize(&current) {
            let mut full = real;
            for name in pending.iter().rev() {
                full.push(name);
            }
            return full;
        }
        let Some(name) = current.file_name().map(|part| part.to_os_string()) else {
            return path.to_path_buf();
        };
        pending.push(name);
        if !current.pop() {
            return path.to_path_buf();
        }
    }
}

pub(super) fn ensure_allowed(path: &Path, roots: &WriteRoots) -> io::Result<()> {
    let path = normalized(path);
    let hidden = has_hidden_component(&path);
    let discovery = is_discovery_file(&path, roots);
    let denied = denied_directories(roots)
        .iter()
        .any(|directory| is_within(&normalized(directory), &path));
    if hidden || discovery || denied || is_webview_data(&path, roots) {
        return Err(io::Error::new(
            ErrorKind::PermissionDenied,
            "Saving there is not allowed.",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundle_identifier_matches_tauri_conf() {
        let config = include_str!("../../tauri.conf.json");
        assert!(
            config.contains(&format!("\"identifier\": \"{BUNDLE_IDENTIFIER}\"")),
            "the write scope bundle id drifted from tauri.conf.json"
        );
    }
}
