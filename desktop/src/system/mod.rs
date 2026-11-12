//! The operating system around the editor window: its WebView, environment, browser, and
//! window.

pub mod browser;
pub mod browser_shot;
pub mod env;
pub mod opener;
#[cfg(target_os = "macos")]
pub mod window;
