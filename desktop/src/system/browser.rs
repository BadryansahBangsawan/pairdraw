//! The built-in browser window: a webview that shows one remote page and shares nothing with the
//! editor.
//!
//! The window is labelled `browser` and appears in no capability file, so none of this app's
//! commands are granted to it. Tauri still installs its own IPC script in every webview; a page
//! can call that bridge, and the capability check rejects the call. This module adds no
//! initialization script and hands the page no app value. Everything the editor learns about the
//! page is reported from here, over events to the `main` window. The window denies every popup.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{
    webview::PageLoadEvent, AppHandle, Emitter, LogicalSize, Manager, Runtime, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tokio::sync::oneshot;
use url::Url;

/// The label of the browser window. No capability file lists it, and none may.
pub const BROWSER_WINDOW_LABEL: &str = "browser";

/// The browser window's own website data store. Sixteen bytes, persistent, and not the editor's.
const BROWSER_DATA_STORE: [u8; 16] = *b"openpencilbrowse";

/// The size a session starts at, and the size it comes back to after a device preset.
const DEFAULT_WIDTH: f64 = 1024.0;
const DEFAULT_HEIGHT: f64 = 768.0;

/// What the editor is told about a page. Every field is the window's own account of itself.
#[derive(Clone, Debug, Serialize)]
pub struct BrowserPageReport {
    pub url: String,
    pub title: String,
}

/// The session's zoom and desktop size, which the window itself forgets on navigation and resize.
#[derive(Default)]
pub struct BrowserWindowState(pub Mutex<BrowserWindowStateFields>);

#[derive(Default)]
pub struct BrowserWindowStateFields {
    /// Page zoom, as a factor (1.0 is 100%).
    pub zoom: f64,
    /// The content size to come back to once a device preset is left.
    pub desktop_size: Option<(f64, f64)>,
}

/// Whether a navigation may proceed. A link, a redirect, and a history move use this, as do the
/// open and navigate commands. `file:` would read this computer, and `javascript:` would run
/// against the window.
fn browser_navigation_allowed(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https") && url.host_str().is_some_and(|host| !host.is_empty())
}

/// The address the browser may load: `http:` or `https:`, nothing else.
fn browser_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|_| "The address is not a URL".to_owned())?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("The browser opens http and https addresses only".to_owned());
    }
    if !browser_navigation_allowed(&parsed) {
        return Err("The address has no site".to_owned());
    }
    Ok(parsed)
}

/// Gives the new window a website data store of its own, so a page on the editor's origin cannot
/// read the editor's local storage. macOS uses a data-store id. Other systems use a directory.
/// The store stays on disk; it is not an incognito session.
fn separate_browser_store<'a, R: Runtime>(
    app: &AppHandle<R>,
    builder: WebviewWindowBuilder<'a, R, AppHandle<R>>,
) -> Result<WebviewWindowBuilder<'a, R, AppHandle<R>>, String> {
    #[cfg(target_os = "macos")]
    {
        let _ = app;
        Ok(builder.data_store_identifier(BROWSER_DATA_STORE))
    }
    #[cfg(not(target_os = "macos"))]
    {
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("browser-webview");
        std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        Ok(builder.data_directory(directory))
    }
}

fn browser_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    app.get_webview_window(BROWSER_WINDOW_LABEL)
        .ok_or_else(|| "The browser window is not open".to_owned())
}

/// Reports the page the window finished loading, and restores the session's zoom, which a
/// navigation otherwise drops.
fn report_page<R: Runtime>(app: &AppHandle<R>, window: &WebviewWindow<R>, url: &Url) {
    if let Some(zoom) = app
        .state::<BrowserWindowState>()
        .0
        .lock()
        .ok()
        .map(|s| s.zoom)
    {
        if zoom != 0.0 && zoom != 1.0 {
            let _ = window.set_zoom(zoom);
        }
    }
    let handle = app.clone();
    let reported = url.to_string();
    let _ = window.eval_with_callback("document.title", move |title| {
        let title = serde_json::from_str::<String>(&title).unwrap_or_default();
        let _ = handle.emit_to(
            "main",
            "browser:page",
            BrowserPageReport {
                url: reported.clone(),
                title,
            },
        );
    });
}

/// Opens the browser on `url`, or navigates the window that is already open. A refusal reaches the
/// editor as the reason the address will not be shown.
#[tauri::command]
pub fn browser_open<R: Runtime>(app: AppHandle<R>, url: String) -> Result<(), String> {
    let url = browser_url(&url)?;
    if let Some(window) = app.get_webview_window(BROWSER_WINDOW_LABEL) {
        window.navigate(url).map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let loaded = app.clone();
    let builder = WebviewWindowBuilder::new(&app, BROWSER_WINDOW_LABEL, WebviewUrl::External(url))
        .title("Browser")
        .inner_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
        .on_navigation(|url| browser_navigation_allowed(url))
        .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
        .on_page_load(move |window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                report_page(&loaded, &window, payload.url());
            }
        });
    let window = separate_browser_store(&app, builder)
        .and_then(|builder| builder.build().map_err(|error| error.to_string()))?;

    let closed = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            if let Ok(mut state) = closed.state::<BrowserWindowState>().0.lock() {
                *state = BrowserWindowStateFields::default();
            }
            let _ = closed.emit_to("main", "browser:closed", ());
        }
    });
    Ok(())
}

#[tauri::command]
pub fn browser_navigate<R: Runtime>(app: AppHandle<R>, url: String) -> Result<(), String> {
    let url = browser_url(&url)?;
    browser_window(&app)?
        .navigate(url)
        .map_err(|error| error.to_string())
}

/// The page's own history, which the window keeps and never reports: the editor offers the moves
/// and lets the page do nothing when there is nowhere to go.
#[tauri::command]
pub fn browser_back<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    browser_window(&app)?
        .eval("history.back()")
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn browser_forward<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    browser_window(&app)?
        .eval("history.forward()")
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn browser_reload<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    browser_window(&app)?
        .reload()
        .map_err(|error| error.to_string())
}

/// Sets the page zoom in percent. It is kept here because a navigation drops the webview's own.
#[tauri::command]
pub fn browser_set_zoom<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, BrowserWindowState>,
    percent: f64,
) -> Result<(), String> {
    let zoom = (percent / 100.0).clamp(0.25, 4.0);
    if let Ok(mut current) = state.0.lock() {
        current.zoom = zoom;
    }
    browser_window(&app)?
        .set_zoom(zoom)
        .map_err(|error| error.to_string())
}

/// Emulates a device by resizing the window's content to the device's CSS size; a size of zero
/// restores the desktop size the session had. The device's pixel density is not emulated: the
/// webview keeps the screen's own scale factor.
#[tauri::command]
pub fn browser_set_device<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, BrowserWindowState>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let window = browser_window(&app)?;
    let mut current = state
        .0
        .lock()
        .map_err(|_| "The browser state is unavailable".to_owned())?;
    let size = if width > 0.0 && height > 0.0 {
        if current.desktop_size.is_none() {
            let size = window.inner_size().map_err(|error| error.to_string())?;
            let scale = window.scale_factor().map_err(|error| error.to_string())?;
            let logical = size.to_logical::<f64>(scale);
            current.desktop_size = Some((logical.width, logical.height));
        }
        LogicalSize::new(width, height)
    } else {
        let (width, height) = current
            .desktop_size
            .unwrap_or((DEFAULT_WIDTH, DEFAULT_HEIGHT));
        LogicalSize::new(width, height)
    };
    window.set_size(size).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn browser_close<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    browser_window(&app)?
        .close()
        .map_err(|error| error.to_string())
}

/// The capturer, evaluated in the page. It reads the DOM and returns clipboard HTML. It is not an
/// initialization script: nothing of the app is stored on the page, and the page cannot call us.
const CAPTURE_RUNTIME: &str = include_str!("browser-capture.js");
const CAPTURE_ERROR_PREFIX: &str = "openpencil-capture-error:";

fn capture_call(call: &str) -> String {
    format!("{CAPTURE_RUNTIME}\n;{call}")
}

/// The text a script returns. The webview JSON-encodes it, and a thrown script returns nothing.
/// The callback may run more than once, so the sender is taken on the first reply.
async fn eval_text<R: Runtime>(window: &WebviewWindow<R>, script: &str) -> Result<String, String> {
    let (sender, receiver) = oneshot::channel();
    let slot = Mutex::new(Some(sender));
    window
        .eval_with_callback(script, move |value| {
            if let Some(sender) = slot.lock().ok().and_then(|mut guard| guard.take()) {
                let _ = sender.send(value);
            }
        })
        .map_err(|error| error.to_string())?;
    let value = receiver
        .await
        .map_err(|_| "The page did not answer".to_owned())?;
    serde_json::from_str::<String>(&value).map_err(|_| "The page returned nothing".to_owned())
}

fn capture_html(html: String) -> Result<String, String> {
    if let Some(error) = html.strip_prefix(CAPTURE_ERROR_PREFIX) {
        return Err(error.to_owned());
    }
    if html.is_empty() {
        return Err("The page returned no capture".to_owned());
    }
    Ok(html)
}

/// The open page as capture HTML. The editor imports it; the page learns nothing from the call.
#[tauri::command]
pub async fn browser_capture_page<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let window = browser_window(&app)?;
    capture_html(eval_text(&window, &capture_call("__openpencilCapturePage()")).await?)
}

#[cfg(test)]
mod tests {
    use super::{browser_navigation_allowed, browser_url, BROWSER_DATA_STORE};
    use url::Url;

    #[test]
    fn opens_http_and_https_pages() {
        for url in [
            "https://example.com/",
            "http://localhost:5173/page?q=1#top",
            "http://127.0.0.1:8080/",
        ] {
            assert!(browser_url(url).is_ok(), "{url} was refused");
        }
    }

    #[test]
    fn a_capture_error_is_the_text_after_the_prefix() {
        assert_eq!(
            super::capture_html("openpencil-capture-error:no document".to_owned()),
            Err("no document".to_owned())
        );
        assert!(super::capture_html(String::new()).is_err());
        assert_eq!(
            super::capture_html("<!--capture-->".to_owned()).as_deref(),
            Ok("<!--capture-->")
        );
    }

    #[test]
    fn refuses_schemes_that_touch_this_computer_or_the_window() {
        for url in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,<h1>x</h1>",
            "blob:https://example.com/1",
            "openpencil://room/1",
            "about:blank",
        ] {
            assert!(browser_url(url).is_err(), "{url} was allowed");
        }
    }

    #[test]
    fn the_browser_store_is_its_own_sixteen_bytes() {
        assert_eq!(BROWSER_DATA_STORE.len(), 16);
        assert_ne!(BROWSER_DATA_STORE, [0; 16]);
    }

    #[test]
    fn a_page_may_move_only_to_an_http_or_https_site() {
        for url in [
            "file:///etc/passwd",
            "data:text/html,hi",
            "javascript:alert(1)",
            "blob:https://example.com/11111111-1111-1111-1111-111111111111",
            "tauri://localhost/",
        ] {
            let parsed = Url::parse(url).expect(url);
            assert!(!browser_navigation_allowed(&parsed), "{url} was allowed");
        }
        for url in ["https://example.com/path", "http://localhost:1420/"] {
            let parsed = Url::parse(url).expect(url);
            assert!(browser_navigation_allowed(&parsed), "{url} was refused");
        }
    }

    #[test]
    fn refuses_addresses_with_no_site() {
        // `http:///path` is the host `path` (the URL standard drops the extra slash), so it is a
        // site. These are the ones that name none.
        for url in ["https://", "http://", "https://:443", "not a url"] {
            assert!(browser_url(url).is_err(), "{url} was allowed");
        }
    }
}
