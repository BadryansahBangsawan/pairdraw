//! Which window shows which document, so a file or link that arrives is sent to the window that
//! already holds it instead of opening a second copy.
//!
//! The frontend fills the registry as its tabs open and close (`claim_document`,
//! `release_document`), since only the realm knows which file a tab shows. Keys are the
//! canonical path: the frontend's tab path, a file association's argv path, and a recent-files
//! path can disagree on symlinks and spelling, and they all name the same document.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Default)]
pub struct OpenDocuments(Mutex<HashMap<PathBuf, String>>);

fn document_key(path: &str) -> PathBuf {
    let literal = PathBuf::from(path);
    literal.canonicalize().unwrap_or(literal)
}

impl OpenDocuments {
    /// Records that `window` shows `path`. The caller opened it on purpose, so it takes the
    /// document even if another window still lists it.
    fn claim(&self, path: &str, window: &str) {
        if path.is_empty() {
            return;
        }
        if let Ok(mut documents) = self.0.lock() {
            documents.insert(document_key(path), window.to_owned());
        }
    }

    /// Drops `path` only while `window` still owns it, so a window closing late cannot release a
    /// claim another window has taken since.
    fn release(&self, path: &str, window: &str) {
        if path.is_empty() {
            return;
        }
        if let Ok(mut documents) = self.0.lock() {
            let key = document_key(path);
            if documents.get(&key).is_some_and(|owner| owner == window) {
                documents.remove(&key);
            }
        }
    }

    /// Forgets every document a closed window held.
    fn release_window(&self, window: &str) {
        if let Ok(mut documents) = self.0.lock() {
            documents.retain(|_, owner| owner != window);
        }
    }

    fn owner(&self, path: &str) -> Option<String> {
        self.0
            .lock()
            .ok()
            .and_then(|documents| documents.get(&document_key(path)).cloned())
    }

    /// A link's path is relative to the repository the user works in, so it is matched by its
    /// trailing segments, the way `path_matches_suffix` resolves it against open tabs.
    fn owner_by_suffix(&self, suffix: &str) -> Option<String> {
        let documents = self.0.lock().ok()?;
        documents
            .iter()
            .find(|(candidate, _)| super::paths::path_ends_with_segments(candidate, suffix))
            .map(|(_, owner)| owner.clone())
    }
}

#[tauri::command]
pub fn claim_document<R: tauri::Runtime>(
    documents: tauri::State<OpenDocuments>,
    window: tauri::WebviewWindow<R>,
    path: String,
) {
    documents.claim(&path, window.label());
}

#[tauri::command]
pub fn release_document<R: tauri::Runtime>(
    documents: tauri::State<OpenDocuments>,
    window: tauri::WebviewWindow<R>,
    path: String,
) {
    documents.release(&path, window.label());
}

/// The window that already shows `path`, if any, so the shell can send it there. A link's path
/// is relative, so a claim it shares only by trailing segments still counts.
pub fn document_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, path: &str) -> Option<String> {
    use tauri::Manager;
    let documents = app.state::<OpenDocuments>();
    documents
        .owner(path)
        .or_else(|| documents.owner_by_suffix(path))
}

/// Forgets the documents of a window that closed; a claim to a window that is gone would send
/// later opens nowhere.
pub fn release_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, window: &str) {
    use tauri::Manager;
    app.state::<OpenDocuments>().release_window(window);
}

#[cfg(test)]
mod tests {
    use super::OpenDocuments;

    #[test]
    fn a_claim_names_the_window_until_it_releases_it() {
        let documents = OpenDocuments::default();
        documents.claim("/tmp/hikyo.pen", "main");
        assert_eq!(documents.owner("/tmp/hikyo.pen").as_deref(), Some("main"));
        documents.release("/tmp/hikyo.pen", "main");
        assert_eq!(documents.owner("/tmp/hikyo.pen"), None);
    }

    #[test]
    fn only_the_owner_releases_a_document() {
        let documents = OpenDocuments::default();
        documents.claim("/tmp/hikyo.pen", "editor-2");
        documents.release("/tmp/hikyo.pen", "main");
        assert_eq!(documents.owner("/tmp/hikyo.pen").as_deref(), Some("editor-2"));
    }

    #[test]
    fn closing_a_window_forgets_only_its_documents() {
        let documents = OpenDocuments::default();
        documents.claim("/tmp/a.pen", "editor-2");
        documents.claim("/tmp/b.pen", "main");
        documents.release_window("editor-2");
        assert_eq!(documents.owner("/tmp/a.pen"), None);
        assert_eq!(documents.owner("/tmp/b.pen").as_deref(), Some("main"));
    }

    #[test]
    fn a_relative_link_path_finds_the_window_holding_the_file() {
        let documents = OpenDocuments::default();
        documents.claim("/repo/web/design/hikyo.pen", "editor-2");
        assert_eq!(
            documents
                .owner_by_suffix("web/design/hikyo.pen")
                .as_deref(),
            Some("editor-2")
        );
        assert_eq!(documents.owner_by_suffix("design/other.pen"), None);
        assert_eq!(documents.owner_by_suffix("/repo/web/design/hikyo.pen"), None);
    }

    #[test]
    fn an_empty_path_is_never_registered() {
        let documents = OpenDocuments::default();
        documents.claim("", "main");
        assert_eq!(documents.owner(""), None);
    }
}
