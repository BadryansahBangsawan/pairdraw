//! Replaces a document file in one rename.
//!
//! The fs plugin truncates the target before it writes, and its scope cannot name a hidden temp
//! file (`requireLiteralLeadingDot`) or rename. This command writes a temp file beside the
//! document, flushes it, and renames it over the target. It refuses the same places the fs scope
//! refuses, including the webview data `fs:deny-default` names (`scope`), so the webview cannot
//! use it to write somewhere a document write must not land.

use std::fs::{self, File, OpenOptions};
use std::io::{self, ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

use super::scope::{ensure_allowed, system_roots, WriteRoots, BUNDLE_IDENTIFIER};

static TEMP_SEQ: AtomicU64 = AtomicU64::new(0);

/// The file a save replaces. A symlink is the file it points at, so the link the document was
/// opened through stays a link. A missing file is the name beside its real parent.
fn resolve_target(path: &Path) -> io::Result<PathBuf> {
    if path.as_os_str().is_empty() {
        return Err(io::Error::new(
            ErrorKind::InvalidInput,
            "The file has no path.",
        ));
    }
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() || metadata.is_file() => {
            fs::canonicalize(path)
        }
        Ok(_) => Err(io::Error::new(
            ErrorKind::InvalidInput,
            "The path is not a file.",
        )),
        Err(error) if error.kind() == ErrorKind::NotFound => {
            let name = path
                .file_name()
                .ok_or_else(|| io::Error::new(ErrorKind::InvalidInput, "The file has no name."))?;
            let parent = path
                .parent()
                .filter(|parent| !parent.as_os_str().is_empty());
            let parent = fs::canonicalize(parent.unwrap_or_else(|| Path::new(".")))?;
            Ok(parent.join(name))
        }
        Err(error) => Err(error),
    }
}

fn temporary_path(target: &Path) -> io::Result<PathBuf> {
    let name = target
        .file_name()
        .ok_or_else(|| io::Error::new(ErrorKind::InvalidInput, "The file has no name."))?;
    let seq = TEMP_SEQ.fetch_add(1, Ordering::Relaxed);
    let temp = format!(
        ".{}.{}.{}.tmp",
        name.to_string_lossy(),
        std::process::id(),
        seq
    );
    Ok(target.with_file_name(temp))
}

fn create_exclusive(path: &Path) -> io::Result<File> {
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        // `open` masks this with the umask. The mode of the file being replaced is applied after.
        options.mode(0o666);
    }
    options.open(path)
}

fn replace_path(from: &Path, to: &Path) -> io::Result<()> {
    #[cfg(windows)]
    {
        // `std::fs::rename` fails on Windows when `to` already exists.
        use std::os::windows::ffi::OsStrExt;
        extern "system" {
            fn MoveFileExW(existing: *const u16, new: *const u16, flags: u32) -> i32;
        }
        const MOVEFILE_REPLACE_EXISTING: u32 = 1;
        const MOVEFILE_WRITE_THROUGH: u32 = 8;
        fn wide(path: &Path) -> Vec<u16> {
            path.as_os_str()
                .encode_wide()
                .chain(std::iter::once(0))
                .collect()
        }
        let from_wide = wide(from);
        let to_wide = wide(to);
        // Safety: both pointers are nul-terminated paths that outlive the call.
        let moved = unsafe {
            MoveFileExW(
                from_wide.as_ptr(),
                to_wide.as_ptr(),
                MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
            )
        };
        if moved == 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(())
        }
    }
    #[cfg(not(windows))]
    {
        fs::rename(from, to)
    }
}

fn sync_parent(target: &Path) {
    let Some(parent) = target.parent() else {
        return;
    };
    if let Ok(directory) = File::open(parent) {
        let _ = directory.sync_all();
    }
}

/// Writes through `write`, then publishes the temp file. `write` runs only against the temp file.
/// A directory that refuses a new file fails the save and leaves the existing document as it was:
/// opening that file with truncation would replace it before the new bytes were durable.
fn commit(
    path: &Path,
    roots: &WriteRoots,
    write: impl FnOnce(&mut File) -> io::Result<()>,
) -> io::Result<()> {
    ensure_allowed(path, roots)?;
    let target = resolve_target(path)?;
    ensure_allowed(&target, roots)?;
    let existing = match fs::metadata(&target) {
        Ok(metadata) if metadata.is_file() => Some(metadata.permissions()),
        Ok(_) => {
            return Err(io::Error::new(
                ErrorKind::InvalidInput,
                "The path is not a file.",
            ))
        }
        Err(error) if error.kind() == ErrorKind::NotFound => None,
        Err(error) => return Err(error),
    };

    let temporary = temporary_path(&target)?;
    let file = match create_exclusive(&temporary) {
        Ok(file) => file,
        Err(error) if existing.is_some() && error.kind() == ErrorKind::PermissionDenied => {
            return Err(io::Error::new(
                ErrorKind::PermissionDenied,
                "The folder will not accept a new file, so the document was left unchanged.",
            ));
        }
        Err(error) => return Err(error),
    };

    let published = (|| {
        let mut file = file;
        #[cfg(unix)]
        if let Some(permissions) = &existing {
            fs::set_permissions(&temporary, permissions.clone())?;
        }
        write(&mut file)?;
        file.sync_all()?;
        drop(file);
        #[cfg(windows)]
        if let Some(permissions) = &existing {
            fs::set_permissions(&temporary, permissions.clone())?;
        }
        replace_path(&temporary, &target)?;
        sync_parent(&target);
        Ok(())
    })();
    if published.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    published
}

pub fn write_document_bytes(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let roots = system_roots()?;
    commit(path, &roots, |file| {
        file.write_all(bytes)?;
        Ok(())
    })
}

fn percent_decode(value: &str) -> Result<String, ()> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err(());
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).map_err(|_| ())?;
            decoded.push(u8::from_str_radix(hex, 16).map_err(|_| ())?);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).map_err(|_| ())
}

fn path_header(request: &tauri::ipc::Request<'_>) -> Result<PathBuf, String> {
    let header = request
        .headers()
        .get("path")
        .ok_or("Missing the file path.")?
        .to_str()
        .map_err(|_| "The file path is not text.")?;
    let path = percent_decode(header).map_err(|_| "The file path could not be read.".to_owned())?;
    if path.is_empty() {
        return Err("The file path is empty.".to_owned());
    }
    Ok(PathBuf::from(path))
}

fn body_bytes(request: &tauri::ipc::Request<'_>) -> Result<Vec<u8>, String> {
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        tauri::ipc::InvokeBody::Json(_) => Err("The document was not sent as bytes.".to_owned()),
    }
}

/// Replaces the document at the `path` header with the raw body. The path is percent-encoded,
/// the same way the fs plugin names a file.
#[tauri::command]
pub fn write_document_file(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let path = path_header(&request)?;
    let bytes = body_bytes(&request)?;
    write_document_bytes(&path, &bytes).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    static NEXT: AtomicU64 = AtomicU64::new(0);

    struct Scratch(PathBuf);

    fn entry_names(path: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(path)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    impl Scratch {
        fn new() -> Self {
            let id = NEXT.fetch_add(1, Ordering::Relaxed);
            let path =
                std::env::temp_dir().join(format!("pairdraw-atomic-{}-{id}", std::process::id()));
            let _ = fs::remove_dir_all(&path);
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }

        fn roots(&self) -> WriteRoots {
            WriteRoots {
                home: self.0.clone(),
                data: self.0.join("data"),
                local_data: self.0.join("local"),
                document: self.0.join("Documents"),
                runtime: Some(self.0.join("runtime")),
            }
        }
    }

    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn an_interrupted_write_keeps_the_previous_file() {
        let scratch = Scratch::new();
        let path = scratch.0.join("design.fig");
        fs::write(&path, b"ORIGINAL").unwrap();

        let error = commit(&path, &scratch.roots(), |file| {
            file.write_all(b"PARTIAL").unwrap();
            Err(io::Error::other("disk full"))
        })
        .unwrap_err();

        assert!(error.to_string().contains("disk full"), "{error}");
        assert_eq!(fs::read(&path).unwrap(), b"ORIGINAL");
        assert_eq!(entry_names(&scratch.0), ["design.fig"]);
    }

    #[test]
    fn a_finished_write_replaces_the_file_and_leaves_no_temp() {
        let scratch = Scratch::new();
        let path = scratch.0.join("design.fig");
        fs::write(&path, b"ORIGINAL").unwrap();

        commit(&path, &scratch.roots(), |file| file.write_all(b"NEXT")).unwrap();

        assert_eq!(fs::read(&path).unwrap(), b"NEXT");
        assert_eq!(entry_names(&scratch.0), ["design.fig"]);
    }

    #[cfg(unix)]
    #[test]
    fn a_replaced_file_keeps_its_mode() {
        use std::os::unix::fs::PermissionsExt;

        let scratch = Scratch::new();
        let path = scratch.0.join("design.fig");
        fs::write(&path, b"ORIGINAL").unwrap();
        let mut permissions = fs::metadata(&path).unwrap().permissions();
        permissions.set_mode(0o640);
        fs::set_permissions(&path, permissions).unwrap();

        commit(&path, &scratch.roots(), |file| file.write_all(b"NEXT")).unwrap();

        assert_eq!(fs::read(&path).unwrap(), b"NEXT");
        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o640
        );
    }

    #[test]
    fn a_new_file_is_created_beside_nothing_else() {
        let scratch = Scratch::new();
        let path = scratch.0.join("fresh.fig");

        commit(&path, &scratch.roots(), |file| file.write_all(b"NEW")).unwrap();

        assert_eq!(fs::read(&path).unwrap(), b"NEW");
        assert_eq!(fs::read_dir(&scratch.0).unwrap().count(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn a_symlink_stays_a_symlink_and_its_target_is_replaced() {
        let scratch = Scratch::new();
        let target = scratch.0.join("real.fig");
        let link = scratch.0.join("link.fig");
        fs::write(&target, b"ORIGINAL").unwrap();
        std::os::unix::fs::symlink(&target, &link).unwrap();

        commit(&link, &scratch.roots(), |file| file.write_all(b"NEXT")).unwrap();

        assert!(fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(fs::read(&target).unwrap(), b"NEXT");
        assert_eq!(fs::read(&link).unwrap(), b"NEXT");
    }

    #[test]
    fn a_hidden_path_is_refused_and_not_created() {
        let scratch = Scratch::new();
        let path = scratch.0.join(".design.fig");

        let error = commit(&path, &scratch.roots(), |file| file.write_all(b"NO")).unwrap_err();

        assert_eq!(error.kind(), ErrorKind::PermissionDenied);
        assert!(!path.exists());
    }

    #[test]
    fn a_startup_folder_and_the_discovery_file_are_refused() {
        let scratch = Scratch::new();
        let roots = scratch.roots();
        let startup = roots.home.join("Library/LaunchAgents/evil.plist");
        let discovery = roots
            .home
            .join("Library/Application Support/Pairdraw/mcp.json");
        fs::create_dir_all(startup.parent().unwrap()).unwrap();
        fs::create_dir_all(discovery.parent().unwrap()).unwrap();
        fs::write(&startup, b"ORIGINAL").unwrap();
        fs::write(&discovery, b"ORIGINAL").unwrap();

        assert!(commit(&startup, &roots, |file| file.write_all(b"NO")).is_err());
        assert!(commit(&discovery, &roots, |file| file.write_all(b"NO")).is_err());
        assert_eq!(fs::read(&startup).unwrap(), b"ORIGINAL");
        assert_eq!(fs::read(&discovery).unwrap(), b"ORIGINAL");
    }

    #[test]
    fn a_link_into_a_refused_folder_is_not_followed() {
        let scratch = Scratch::new();
        let roots = scratch.roots();
        let startup = roots.home.join("Library/LaunchAgents");
        fs::create_dir_all(&startup).unwrap();
        let target = startup.join("evil.plist");
        fs::write(&target, b"ORIGINAL").unwrap();
        let link = scratch.0.join("design.fig");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&target, &link).unwrap();
        #[cfg(not(unix))]
        fs::write(&link, b"ORIGINAL").unwrap();

        #[cfg(unix)]
        {
            assert!(commit(&link, &roots, |file| file.write_all(b"NO")).is_err());
            assert_eq!(fs::read(&target).unwrap(), b"ORIGINAL");
        }
    }

    #[cfg(unix)]
    #[test]
    fn an_existing_file_stays_when_its_directory_takes_no_new_file() {
        use std::os::unix::fs::PermissionsExt;

        let scratch = Scratch::new();
        let path = scratch.0.join("design.fig");
        fs::write(&path, b"ORIGINAL").unwrap();
        let directory = fs::metadata(&scratch.0).unwrap().permissions();
        let mut frozen = directory.clone();
        frozen.set_mode(0o500);
        fs::set_permissions(&scratch.0, frozen).unwrap();
        let result = commit(&path, &scratch.roots(), |file| file.write_all(b"NEXT"));
        fs::set_permissions(&scratch.0, directory).unwrap();

        assert_eq!(result.unwrap_err().kind(), ErrorKind::PermissionDenied);
        assert_eq!(fs::read(&path).unwrap(), b"ORIGINAL");
        assert_eq!(fs::read_dir(&scratch.0).unwrap().count(), 1);
    }

    #[test]
    fn webview_data_the_fs_plugin_denies_is_refused() {
        let scratch = Scratch::new();
        let roots = scratch.roots();
        let root = roots.local_data.join(BUNDLE_IDENTIFIER);
        let cookies = root.join("cookies");
        let nested = root.join("EBWebView").join("Default").join("design.fig");
        let storage = root.join("localstorage").join("design.fig");
        for path in [&cookies, &nested, &storage] {
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(path, b"ORIGINAL").unwrap();
            let error = commit(path, &roots, |file| file.write_all(b"NO")).unwrap_err();
            assert_eq!(error.kind(), ErrorKind::PermissionDenied, "{path:?}");
            assert_eq!(fs::read(path).unwrap(), b"ORIGINAL");
        }

        let allowed = roots.local_data.join("notes.fig");
        commit(&allowed, &roots, |file| file.write_all(b"OK")).unwrap();
        assert_eq!(fs::read(&allowed).unwrap(), b"OK");
    }

    #[test]
    fn decodes_the_path_header_the_fs_plugin_sends() {
        assert_eq!(
            percent_decode("%2Ftmp%2Fdesign%20file.fig").unwrap(),
            "/tmp/design file.fig"
        );
        assert!(percent_decode("%2").is_err());
        assert!(percent_decode("%ZZ").is_err());
    }
}
