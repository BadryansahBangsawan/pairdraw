use std::io::{Error, ErrorKind};

use tauri::{Manager, WebviewWindow};

/// The label of the window the app starts with. Every other editor window is `editor-<n>`.
pub const MAIN_WINDOW_LABEL: &str = "main";
const EDITOR_LABEL_PREFIX: &str = "editor-";

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

/// Whether a label names one of the app's editor windows rather than the updater's webview.
pub fn is_editor_label(label: &str) -> bool {
    label == MAIN_WINDOW_LABEL || label.starts_with(EDITOR_LABEL_PREFIX)
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
