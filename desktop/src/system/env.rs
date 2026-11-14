//! What the system and environment tell the frontend about where it runs.

/// Version of the system WebView engine the app is rendering in, so the
/// startup support gate can name it when the engine is too old. Uses the
/// WebKit bundle version on macOS, the WebKitGTK version on Linux, and the
/// WebView2 runtime version on Windows; `None` when the runtime cannot report it.
#[tauri::command]
pub fn webview_version() -> Option<String> {
    tauri::webview_version().ok()
}
