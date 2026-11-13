//! Quitting the app across every open window. Each editor window owns its documents, so each
//! confirms its own before the app exits; one window declining cancels the quit for all.

use std::collections::HashSet;
use std::sync::Mutex;

use tauri::{Emitter, Manager};

use super::window::is_editor_label;

/// The windows that have not answered the current quit, while one is pending.
#[derive(Default)]
pub struct PendingQuit(Mutex<Option<HashSet<String>>>);

/// Drops a window that closed before it answered. True when it was the last one still asked,
/// so the quit can finish; a window that was not asked, or a close with nothing pending, does not.
pub(crate) fn drop_closed_window(waiting: &mut Option<HashSet<String>>, window: &str) -> bool {
    let Some(labels) = waiting.as_mut() else {
        return false;
    };
    if !labels.remove(window) {
        return false;
    }
    if labels.is_empty() {
        *waiting = None;
        return true;
    }
    false
}

fn record_answer(waiting: &mut Option<HashSet<String>>, window: &str, approved: bool) -> bool {
    let Some(labels) = waiting.as_mut() else {
        return false;
    };
    if !approved {
        *waiting = None;
        return false;
    }
    labels.remove(window);
    if labels.is_empty() {
        *waiting = None;
        return true;
    }
    false
}

/// Asks every editor window whether its documents may close. The app exits once the last one
/// agrees; a window that declines cancels the whole quit, and answers that arrive afterwards are
/// ignored. The updater webview owns no documents and is never asked.
pub fn request_quit<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let labels = app
        .webview_windows()
        .keys()
        .filter(|label| is_editor_label(label))
        .cloned()
        .collect::<HashSet<_>>();
    if labels.is_empty() {
        app.exit(0);
        return;
    }
    let state = app.state::<PendingQuit>();
    match state.0.lock() {
        Ok(mut pending) => *pending = Some(labels.clone()),
        Err(_) => return,
    }
    for label in labels {
        let _ = app.emit_to(label.as_str(), "menu-event", "quit");
    }
}

#[tauri::command]
pub fn answer_quit<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::WebviewWindow<R>,
    approved: bool,
) {
    let state = app.state::<PendingQuit>();
    let exit = match state.0.lock() {
        Ok(mut pending) => record_answer(&mut pending, window.label(), approved),
        Err(_) => false,
    };
    if exit {
        app.exit(0);
    }
}

/// A window that closed can no longer answer a quit. If it was the last one still asked, the
/// app exits; closing a window while nothing is pending does not.
pub fn note_window_destroyed<R: tauri::Runtime>(app: &tauri::AppHandle<R>, window: &str) {
    let state = app.state::<PendingQuit>();
    let exit = match state.0.lock() {
        Ok(mut pending) => drop_closed_window(&mut pending, window),
        Err(_) => false,
    };
    if exit {
        app.exit(0);
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::record_answer;

    fn waiting(labels: &[&str]) -> Option<HashSet<String>> {
        Some(labels.iter().map(|label| label.to_string()).collect())
    }

    #[test]
    fn the_app_exits_only_after_every_window_agrees() {
        let mut pending = waiting(&["main", "editor-2"]);
        assert!(!record_answer(&mut pending, "main", true));
        assert_eq!(pending.as_ref().map(HashSet::len), Some(1));
        assert!(record_answer(&mut pending, "editor-2", true));
        assert_eq!(pending, None);
    }

    #[test]
    fn one_refusal_cancels_the_quit_for_every_window() {
        let mut pending = waiting(&["main", "editor-2"]);
        assert!(!record_answer(&mut pending, "main", true));
        assert!(!record_answer(&mut pending, "editor-2", false));
        assert_eq!(pending, None);
        // A late approval from a window that had not answered cannot quit now.
        assert!(!record_answer(&mut pending, "main", true));
    }

    #[test]
    fn an_answer_without_a_pending_quit_does_nothing() {
        let mut pending = None;
        assert!(!record_answer(&mut pending, "main", true));
    }
}
