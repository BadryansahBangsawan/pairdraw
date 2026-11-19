use std::io::{Error, ErrorKind};

use tauri::{Manager, WebviewWindow};

/// The label of the window the app starts with. Every other editor window is `editor-<n>`.
pub const MAIN_WINDOW_LABEL: &str = "main";
const EDITOR_LABEL_PREFIX: &str = "editor-";

/// WebKit ended the editor's page process, as a crash in its JavaScript engine does: the page
/// loads again, so the window is not left blank and the new page offers the work its recovery
/// copies kept. Tauri's default handler does nothing when it finds its window table borrowed;
/// this hook is handed the webview itself.
#[cfg(target_os = "macos")]
pub fn reload_after_page_process_ended<R: tauri::Runtime>(webview: &tauri::Webview<R>) {
    eprintln!(
        "[webview] the page process of {} ended; reloading",
        webview.label()
    );
    if let Err(error) = webview.reload() {
        eprintln!("[webview] could not reload {}: {error}", webview.label());
    }
}

/// The first free `editor-<n>`, so a window closed and opened again keeps a small label.
fn next_editor_label(taken: &[String]) -> String {
    let mut index = 2;
    loop {
        let candidate = format!("{EDITOR_LABEL_PREFIX}{index}");
        if !taken.contains(&candidate) {
            return candidate;
        }
        index += 1;
    }
}

/// Builds one editor window from the window the app configures. Every window shares its title,
/// size, and page; only the label differs, and that label is the window's identity
/// (`src/app/window/identity.ts`).
fn build_editor_window<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
) -> tauri::Result<WebviewWindow<R>> {
    let mut config = app
        .config()
        .app
        .windows
        .first()
        .cloned()
        .ok_or_else(|| {
            Error::new(
                ErrorKind::NotFound,
                "no window is configured in tauri.conf.json",
            )
        })?;
    config.label = label.to_owned();
    tauri::WebviewWindowBuilder::from_config(app, &config)?
        .on_new_window(super::opener::open_new_window_externally(app.clone()))
        .build()
}

/// Builds the window the app starts with, before the UI mounts.
pub fn build_main_window<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> tauri::Result<WebviewWindow<R>> {
    build_editor_window(app, MAIN_WINDOW_LABEL)
}

/// Opens an editor window beside the focused one; the frontend's File › New Window calls it.
///
/// The command is async because creating a window in a synchronous command deadlocks WebView2 on
/// Windows (`tauri::WebviewWindowBuilder::from_config`).
#[tauri::command]
pub async fn open_window<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    let taken = app.webview_windows().keys().cloned().collect::<Vec<_>>();
    let label = next_editor_label(&taken);
    build_editor_window(&app, &label).map_err(|error| error.to_string())?;
    Ok(label)
}

/// Brings a window forward for something that arrived for it.
pub fn focus<R: tauri::Runtime>(window: &WebviewWindow<R>) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

/// Whether a label names one of the app's editor windows rather than the updater's webview.
pub fn is_editor_label(label: &str) -> bool {
    label == MAIN_WINDOW_LABEL || label.starts_with(EDITOR_LABEL_PREFIX)
}

/// Windows that hear a browser page or closed report. Every editor keeps its own copy of the
/// session, so a second window that opened the browser has to hear the page too. The browser
/// page itself is not an editor and is not told.
pub fn editor_report_labels(labels: &[String]) -> Vec<String> {
    labels
        .iter()
        .filter(|label| is_editor_label(label))
        .cloned()
        .collect()
}

/// The window an unowned arriving file is delivered to. The browser and the updater are not
/// editors: a file queued to either label is never opened, so a focused one falls through to
/// `main`, then to any editor.
pub fn unowned_file_window(focused: Option<&str>, labels: &[String]) -> Option<String> {
    if focused.is_some_and(is_editor_label) {
        return focused.map(str::to_owned);
    }
    if labels.iter().any(|label| label == MAIN_WINDOW_LABEL) {
        return Some(MAIN_WINDOW_LABEL.to_owned());
    }
    labels
        .iter()
        .filter(|label| is_editor_label(label))
        .min()
        .cloned()
}

/// The window a command belongs to: the one with focus among the editor windows. Before any
/// window has focus, as during startup, the main window stands in; with several and none focused,
/// any editor window does.
pub fn focused_window<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Option<WebviewWindow<R>> {
    let windows = app.webview_windows();
    let focused = windows
        .iter()
        .filter(|(label, _)| is_editor_label(label))
        .find(|(_, window)| window.is_focused().unwrap_or(false))
        .map(|(_, window)| (*window).clone());
    focused
        .or_else(|| windows.get(MAIN_WINDOW_LABEL).cloned())
        .or_else(|| {
            windows
                .iter()
                .find(|(label, _)| is_editor_label(label))
                .map(|(_, window)| (*window).clone())
        })
}

#[cfg(target_os = "macos")]
pub fn show_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    // macOS keeps the app running with no windows; the dock icon opens one again.
    if let Ok(window) = build_editor_window(app, MAIN_WINDOW_LABEL) {
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::{is_editor_label, next_editor_label};

    fn labels(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| value.to_string()).collect()
    }

    #[test]
    fn only_editor_windows_count_for_commands() {
        assert!(is_editor_label("main"));
        assert!(is_editor_label("editor-2"));
        assert!(!is_editor_label("updater"));
        assert!(!is_editor_label("editor"));
    }

    #[test]
    fn numbers_new_windows_from_two() {
        assert_eq!(next_editor_label(&labels(&["main"])), "editor-2");
    }

    #[test]
    fn reuses_a_closed_window_label() {
        assert_eq!(
            next_editor_label(&labels(&["main", "editor-2", "editor-4"])),
            "editor-3"
        );
    }
}
