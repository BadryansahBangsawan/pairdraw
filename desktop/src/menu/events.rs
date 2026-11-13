use tauri::Emitter;

use crate::system::window::focused_window;

pub fn handle_menu_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event_id: &str) {
    let focused = focused_window(app);
    #[cfg(debug_assertions)]
    if event_id == "dev-tools" {
        if let Some(window) = focused {
            if window.is_devtools_open() {
                window.close_devtools();
            } else {
                window.open_devtools();
            }
        }
        return;
    }
    // A command belongs to the window in front: the document it saves, the tab it closes, and the
    // selection it acts on are that window's, so no other window may run it as well.
    if let Some(window) = focused {
        let _ = app.emit_to(window.label(), "menu-event", event_id);
    }
}
