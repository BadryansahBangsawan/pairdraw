//! The recent files the native menu lists.

use crate::menu::set_recent_files as set_menu_recent_files;

#[tauri::command]
pub fn set_recent_files(app: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    set_menu_recent_files(&app, paths)
}
