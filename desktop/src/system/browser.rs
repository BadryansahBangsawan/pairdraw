//! The built-in browser window: a webview that shows one remote page and shares nothing with the
//! editor.
//!
//! The window is labelled `browser` and appears in no capability file, so none of this app's
//! commands are granted to it. Tauri still installs its own IPC script in every webview; a page
//! can call that bridge, and the capability check rejects the call. This module adds no
//! initialization script and hands the page no app value. Everything the editor learns about the
//! page is reported from here, over events to every editor window. The window denies every popup.

use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{
    webview::PageLoadEvent, AppHandle, Emitter, LogicalSize, Manager, Runtime, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tokio::sync::oneshot;
use url::Url;

/// The label of the browser window. No capability file lists it, and none may.
pub const BROWSER_WINDOW_LABEL: &str = "browser";

/// The browser window's own website data store. Sixteen bytes, persistent, and not the editor's.
const BROWSER_DATA_STORE: [u8; 16] = *b"pairdraw-browser";

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

pub(crate) fn browser_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
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
        emit_to_editors(
            &handle,
            "browser:page",
            BrowserPageReport {
                url: reported.clone(),
                title,
            },
        );
    });
}

/// Tells every editor window. Each one keeps its own session, and the page that was shown is
/// not an editor, so it is not a target.
fn emit_to_editors<R: Runtime, S: Serialize + Clone>(app: &AppHandle<R>, event: &str, payload: S) {
    let labels = app.webview_windows().keys().cloned().collect::<Vec<_>>();
    for label in super::window::editor_report_labels(&labels) {
        let _ = app.emit_to(label.as_str(), event, payload.clone());
    }
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
        .on_navigation(browser_navigation_allowed)
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
            emit_to_editors(&closed, "browser:closed", ());
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
const CAPTURE_ERROR_PREFIX: &str = "pairdraw-capture-error:";

fn capture_call(call: &str) -> String {
    format!("{CAPTURE_RUNTIME}\n;{call}")
}

/// The text a script returns. The webview JSON-encodes it, and a thrown script returns nothing.
/// The callback may run more than once, so the sender is taken on the first reply.
pub(crate) async fn eval_text<R: Runtime>(
    window: &WebviewWindow<R>,
    script: &str,
) -> Result<String, String> {
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

/// Stops waiting when the page never finishes. `expired` is the sentence the caller shows.
pub(crate) async fn until_deadline<T>(
    pending: impl std::future::Future<Output = Result<T, String>>,
    wait: Duration,
    expired: &str,
) -> Result<T, String> {
    match tokio::time::timeout(wait, pending).await {
        Ok(result) => result,
        Err(_) => Err(expired.to_owned()),
    }
}

async fn eval_pick<R: Runtime>(window: &WebviewWindow<R>) -> Result<String, String> {
    until_deadline(
        eval_text(window, PICK_ELEMENT),
        Duration::from_secs(30),
        "The pick timed out",
    )
    .await
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
    capture_html(eval_text(&window, &capture_call("__pairdrawCapturePage()")).await?)
}

/// What the picker returns when the user does not choose an element. The toolbar shows it as a
/// cancel, not as a failed capture.
const PICK_CANCELLED: &str = "The pick was cancelled";
const PICK_ELEMENT: &str = include_str!("browser-pick.js");

fn picked_selector(picked: &str) -> Result<&str, String> {
    if picked.is_empty() || picked == PICK_CANCELLED {
        Err(PICK_CANCELLED.to_owned())
    } else {
        Ok(picked)
    }
}

fn element_call(selector: &str) -> Result<String, String> {
    let quoted = serde_json::to_string(selector).map_err(|error| error.to_string())?;
    Ok(capture_call(&format!(
        "__pairdrawCaptureElement({quoted})"
    )))
}

/// One element of the open page, chosen by a click in that page. The overlay is gone before the
/// capturer runs, and a cancel imports nothing.
#[tauri::command]
pub async fn browser_capture_element<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let window = browser_window(&app)?;
    let picked = eval_pick(&window).await?;
    let selector = picked_selector(&picked)?;
    capture_html(eval_text(&window, &element_call(selector)?).await?)
}

#[derive(Deserialize)]
struct JsonBox {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Deserialize)]
struct JsonSize {
    width: f64,
    height: f64,
}

async fn element_rect<R: Runtime>(
    window: &WebviewWindow<R>,
) -> Result<crate::system::browser_shot::ShotRect, String> {
    let picked = eval_pick(window).await?;
    let selector = picked_selector(&picked)?.to_owned();
    let quoted = serde_json::to_string(&selector).map_err(|error| error.to_string())?;
    let script = format!(
        "(() => {{ const el = document.querySelector({quoted}); if (!el) return \"\"; el.scrollIntoView({{block:\"nearest\",inline:\"nearest\"}}); const r = el.getBoundingClientRect(); return JSON.stringify({{x:r.x,y:r.y,width:r.width,height:r.height}}); }})()"
    );
    let reported = eval_text(window, &script).await?;
    if reported.is_empty() {
        return Err("The element is not on the page".to_owned());
    }
    let view: JsonBox =
        serde_json::from_str(&reported).map_err(|_| "The element has no size".to_owned())?;
    if !view.width.is_finite()
        || !view.height.is_finite()
        || view.width <= 0.0
        || view.height <= 0.0
    {
        return Err("The element has no size".to_owned());
    }
    Ok(crate::system::browser_shot::ShotRect {
        x: view.x.max(0.0),
        y: view.y.max(0.0),
        width: view.width,
        height: view.height,
    })
}

async fn grow_to_page<R: Runtime>(window: &WebviewWindow<R>) -> Result<LogicalSize<f64>, String> {
    let physical = window.inner_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let previous = physical.to_logical::<f64>(scale);
    let reported = eval_text(
        window,
        "JSON.stringify({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})",
    )
    .await?;
    let size: JsonSize =
        serde_json::from_str(&reported).map_err(|_| "The page has no size".to_owned())?;
    let (width, height) = crate::system::browser_shot::capped_document(size.width, size.height)?;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    Ok(previous)
}

/// A PNG of the open page, as base64. `kind` is `visible`, `full`, or `element`.
#[tauri::command]
pub async fn browser_screenshot<R: Runtime>(
    app: AppHandle<R>,
    kind: String,
) -> Result<String, String> {
    use crate::system::browser_shot::{capture_png, shot_kind, ShotKind};

    let window = browser_window(&app)?;
    let mode = shot_kind(&kind)?;
    let previous = if mode == ShotKind::Full {
        Some(grow_to_page(&window).await?)
    } else {
        None
    };
    let rect = if mode == ShotKind::Element {
        match element_rect(&window).await {
            Ok(rect) => Some(rect),
            Err(error) => {
                if let Some(size) = previous {
                    let _ = window.set_size(size);
                }
                return Err(error);
            }
        }
    } else {
        None
    };
    let shot = capture_png(&window, rect).await;
    if let Some(size) = previous {
        let _ = window.set_size(size);
    }
    shot
}

/// The open page's own account of itself: its URL, its title, and the characters `innerText`
/// shows. The script returns a JSON string. It is not the capturer, and the text is not HTML.
pub(crate) fn page_text_script() -> &'static str {
    r#"JSON.stringify({url:location.href,title:document.title,text:(document.body&&document.body.innerText)||""})"#
}

/// The open page's URL, title, and visible text. The caller treats that text as data.
#[tauri::command]
pub async fn browser_page_text<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let window = browser_window(&app)?;
    eval_text(&window, page_text_script()).await
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
            super::capture_html("pairdraw-capture-error:no document".to_owned()),
            Err("no document".to_owned())
        );
        assert!(super::capture_html(String::new()).is_err());
        assert_eq!(
            super::capture_html("<!--capture-->".to_owned()).as_deref(),
            Ok("<!--capture-->")
        );
    }

    #[test]
    fn a_cancelled_pick_is_not_a_selector() {
        assert_eq!(
            super::picked_selector(""),
            Err("The pick was cancelled".to_owned())
        );
        assert_eq!(
            super::picked_selector("The pick was cancelled"),
            Err("The pick was cancelled".to_owned())
        );
        assert_eq!(super::picked_selector("main > p"), Ok("main > p"));
    }

    #[test]
    fn an_element_selector_is_quoted_into_the_capturer_call() {
        let call = super::element_call("a[href=\"x\"]").expect("quoted");
        assert!(call.contains("__pairdrawCaptureElement"));
        assert!(call.ends_with("__pairdrawCaptureElement(\"a[href=\\\"x\\\"]\")"));
    }

    #[test]
    fn refuses_schemes_that_touch_this_computer_or_the_window() {
        for url in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,<h1>x</h1>",
            "blob:https://example.com/1",
            "pairdraw://room/1",
            "about:blank",
        ] {
            assert!(browser_url(url).is_err(), "{url} was allowed");
        }
    }

    #[test]
    fn a_silent_pick_ends_with_a_clear_error() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let result = super::until_deadline(
                std::future::pending::<Result<String, String>>(),
                std::time::Duration::from_millis(20),
                "The pick timed out",
            )
            .await;
            assert_eq!(result, Err("The pick timed out".to_owned()));
        });
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
    fn page_text_is_inner_text_not_a_capture() {
        let script = super::page_text_script();
        assert!(script.contains("innerText"));
        assert!(script.contains("JSON.stringify"));
        assert!(!script.contains("__pairdrawCapture"));
        assert!(!script.contains("innerHTML"));
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
