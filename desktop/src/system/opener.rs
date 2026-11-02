use std::path::{Component, Path, PathBuf};

use url::Url;

/// Links the editor sends to the system browser or mail app. Anything else, such as `file:` or
/// another app's scheme, is refused rather than handed to the operating system.
const EXTERNAL_SCHEMES: [&str; 3] = ["http", "https", "mailto"];

fn external_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "The link is not a valid address".to_owned())?;
    if EXTERNAL_SCHEMES.contains(&parsed.scheme()) {
        Ok(parsed)
    } else {
        Err("The link does not open in a browser".to_owned())
    }
}

/// Native-test builds record the links they would open, so a test can read the sign-in address
/// without a browser window opening on the machine running it.
#[cfg(feature = "native-test")]
#[derive(Default)]
pub struct OpenedExternalUrls(pub std::sync::Mutex<Vec<String>>);

#[cfg(not(feature = "native-test"))]
#[tauri::command]
pub fn open_external_url<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    url: String,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let url = external_url(&url)?;
    app.opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|error| error.to_string())
}

#[cfg(feature = "native-test")]
#[tauri::command]
pub fn open_external_url(
    state: tauri::State<OpenedExternalUrls>,
    url: String,
) -> Result<(), String> {
    let url = external_url(&url)?;
    state
        .0
        .lock()
        .map_err(|_| "Native test opener state is unavailable".to_owned())?
        .push(url.into());
    Ok(())
}

/// Sends a page the editor opens in a new window, through `window.open`, to the system browser
/// as `open_external_url` does. The webview opens no window of its own; without this handler it
/// would drop the request and the link would do nothing.
pub fn open_new_window_externally<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> impl Fn(tauri::Url, tauri::webview::NewWindowFeatures) -> tauri::webview::NewWindowResponse<R>
       + Send
       + 'static {
    move |url, _| {
        #[cfg(not(feature = "native-test"))]
        let opened = open_external_url(app.clone(), url.to_string());
        #[cfg(feature = "native-test")]
        let opened = {
            use tauri::Manager;
            open_external_url(app.state::<OpenedExternalUrls>(), url.to_string())
        };
        if let Err(error) = opened {
            eprintln!("[opener] {url}: {error}");
        }
        tauri::webview::NewWindowResponse::Deny
    }
}

#[cfg(feature = "native-test")]
#[tauri::command]
pub fn take_native_test_opened_urls(state: tauri::State<OpenedExternalUrls>) -> Vec<String> {
    state
        .0
        .lock()
        .map(|mut urls| urls.drain(..).collect())
        .unwrap_or_default()
}

/// A file the editor may show in the file manager: an absolute path on this computer, with no
/// `..`, that exists. Paths on another machine (`\\server\share`, `//server/share`) are refused,
/// since even looking one up reaches out to that machine, and a model writes these links.
fn local_file_path(path: &str) -> Result<PathBuf, String> {
    if path.is_empty() || path.contains('\0') {
        return Err("The file path is not valid".to_owned());
    }
    if path.starts_with("//") || path.starts_with("\\\\") {
        return Err("Files on other computers are not shown".to_owned());
    }
    let candidate = Path::new(path);
    if !candidate.is_absolute() {
        return Err("The file path is not absolute".to_owned());
    }
    for component in candidate.components() {
        match component {
            Component::ParentDir | Component::CurDir => {
                return Err("The file path is not valid".to_owned())
            }
            #[cfg(windows)]
            Component::Prefix(prefix) => {
                use std::path::Prefix;
                if !matches!(prefix.kind(), Prefix::Disk(_) | Prefix::VerbatimDisk(_)) {
                    return Err("Files on other computers are not shown".to_owned());
                }
            }
            _ => {}
        }
    }
    std::fs::symlink_metadata(candidate).map_err(|_| "The file does not exist".to_owned())?;
    Ok(candidate.to_path_buf())
}

/// Shows a file in the system's file manager, selected, for a link to it in a chat reply. It
/// never opens or runs the file.
#[cfg(not(feature = "native-test"))]
#[tauri::command]
pub fn reveal_local_file<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let path = local_file_path(&path)?;
    app.opener()
        .reveal_item_in_dir(path)
        .map_err(|error| error.to_string())
}

/// Native-test builds record the files they would show, as they do links.
#[cfg(feature = "native-test")]
#[derive(Default)]
pub struct RevealedLocalFiles(pub std::sync::Mutex<Vec<String>>);

#[cfg(feature = "native-test")]
#[tauri::command]
pub fn reveal_local_file(
    state: tauri::State<RevealedLocalFiles>,
    path: String,
) -> Result<(), String> {
    let path = local_file_path(&path)?;
    state
        .0
        .lock()
        .map_err(|_| "Native test opener state is unavailable".to_owned())?
        .push(path.to_string_lossy().into_owned());
    Ok(())
}

#[cfg(feature = "native-test")]
#[tauri::command]
pub fn take_native_test_revealed_files(state: tauri::State<RevealedLocalFiles>) -> Vec<String> {
    state
        .0
        .lock()
        .map(|mut paths| paths.drain(..).collect())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{external_url, local_file_path};

    #[test]
    fn reveals_existing_local_files_only() {
        let manifest = env!("CARGO_MANIFEST_DIR");
        assert!(local_file_path(manifest).is_ok());
        let cargo = std::path::Path::new(manifest).join("Cargo.toml");
        assert!(local_file_path(&cargo.to_string_lossy()).is_ok());
        let missing = std::path::Path::new(manifest).join("no-such-file.txt");
        let escaping = format!("{manifest}/src/../Cargo.toml");
        for path in [
            "",
            "Cargo.toml",
            "relative/notes.md",
            "//server/share/notes.md",
            "\\\\server\\share\\notes.md",
            "/tmp/a\0b",
            escaping.as_str(),
            missing.to_string_lossy().as_ref(),
        ] {
            assert!(local_file_path(path).is_err(), "{path}");
        }
    }

    #[test]
    fn opens_web_and_mail_links_only() {
        assert!(external_url("https://cloud.example.com/auth/device?user_code=ABCD").is_ok());
        assert!(external_url("http://192.168.1.20:3000/account").is_ok());
        assert!(external_url("mailto:team@example.com").is_ok());
        for url in [
            "file:///etc/passwd",
            "openpencil://open?file=a.pen",
            "javascript:alert(1)",
            "not a link",
        ] {
            assert!(external_url(url).is_err(), "{url}");
        }
    }
}
