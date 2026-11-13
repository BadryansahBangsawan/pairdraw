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

    /// The windows whose files end with a relative link's path, sorted so the list never follows
    /// map iteration order.
    fn owners_by_suffix(&self, suffix: &str) -> Vec<String> {
        let Ok(documents) = self.0.lock() else {
            return Vec::new();
        };
        let mut owners: Vec<String> = documents
            .iter()
            .filter(|(candidate, _)| super::paths::path_ends_with_segments(candidate, suffix))
            .map(|(_, owner)| owner.clone())
            .collect();
        owners.sort();
        owners.dedup();
        owners
    }
}

/// Picks among windows whose files match a relative link. One match is the answer. Several are
/// ambiguous, so the focused window decides only if it is one of them; otherwise the caller keeps
/// its usual routing rather than following a map's order.
fn choose_owner(owners: &[String], focused: Option<&str>) -> Option<String> {
    match owners {
        [] => None,
        [only] => Some(only.clone()),
        _ => focused
            .filter(|focused| owners.iter().any(|owner| owner == focused))
            .map(str::to_owned),
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
    if let Some(owner) = documents.owner(path) {
        return Some(owner);
    }
    let owners = documents.owners_by_suffix(path);
    let focused = crate::system::window::focused_window(app)
        .map(|window| window.label().to_owned());
    choose_owner(&owners, focused.as_deref())
}

/// Forgets the documents of a window that closed; a claim to a window that is gone would send
/// later opens nowhere.
pub fn release_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>, window: &str) {
    use tauri::Manager;
    app.state::<OpenDocuments>().release_window(window);
}

#[cfg(test)]
mod tests {
    use super::{choose_owner, OpenDocuments};

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
            documents.owners_by_suffix("web/design/hikyo.pen"),
            vec!["editor-2"]
        );
        assert!(documents.owners_by_suffix("design/other.pen").is_empty());
        assert!(documents
            .owners_by_suffix("/repo/web/design/hikyo.pen")
            .is_empty());
        assert_eq!(
            choose_owner(&["editor-2".to_owned()], None),
            Some("editor-2".to_owned())
        );
    }

    #[test]
    fn a_suffix_shared_by_two_windows_does_not_follow_map_order() {
        let documents = OpenDocuments::default();
        documents.claim("/repo/a/web/design/hikyo.pen", "editor-2");
        documents.claim("/repo/b/web/design/hikyo.pen", "main");

        let owners = documents.owners_by_suffix("web/design/hikyo.pen");
        assert_eq!(owners, vec!["editor-2", "main"]);

        assert_eq!(choose_owner(&owners, None), None);
        assert_eq!(
            choose_owner(&owners, Some("main")),
            Some("main".to_owned())
        );
        assert_eq!(
            choose_owner(&owners, Some("editor-2")),
            Some("editor-2".to_owned())
        );
        assert_eq!(choose_owner(&owners, Some("updater")), None);
    }

    #[test]
    fn an_empty_path_is_never_registered() {
        let documents = OpenDocuments::default();
        documents.claim("", "main");
        assert_eq!(documents.owner(""), None);
    }

    #[test]
    fn a_window_that_closes_during_quit_does_not_hold_the_others() {
        use std::collections::HashSet;

        let mut pending = Some(
            ["main", "editor-2"]
                .into_iter()
                .map(str::to_owned)
                .collect::<HashSet<_>>(),
        );
        assert!(!crate::system::quit::drop_closed_window(
            &mut pending,
            "browser"
        ));
        assert!(!crate::system::quit::drop_closed_window(
            &mut pending,
            "editor-2"
        ));
        assert_eq!(pending.as_ref().map(HashSet::len), Some(1));
        assert!(crate::system::quit::drop_closed_window(&mut pending, "main"));
        assert_eq!(pending, None);

        let mut idle = None;
        assert!(!crate::system::quit::drop_closed_window(&mut idle, "main"));
    }

    #[test]
    fn browser_reports_reach_every_editor_and_not_the_page() {
        let labels = vec![
            "browser".to_owned(),
            "editor-2".to_owned(),
            "main".to_owned(),
            "updater".to_owned(),
        ];
        let mut targets = crate::system::window::editor_report_labels(&labels);
        targets.sort();
        assert_eq!(
            targets,
            vec!["editor-2".to_owned(), "main".to_owned()]
        );
    }

    #[test]
    fn an_unowned_file_opened_while_the_browser_is_focused_goes_to_an_editor() {
        let labels = vec![
            "main".to_owned(),
            "browser".to_owned(),
            "editor-2".to_owned(),
        ];
        assert_eq!(
            crate::system::window::unowned_file_window(Some("browser"), &labels).as_deref(),
            Some("main")
        );
        assert_eq!(
            crate::system::window::unowned_file_window(Some("updater"), &labels).as_deref(),
            Some("main")
        );
        assert_eq!(
            crate::system::window::unowned_file_window(Some("editor-2"), &labels).as_deref(),
            Some("editor-2")
        );
        let no_main = vec!["browser".to_owned(), "editor-2".to_owned()];
        assert_eq!(
            crate::system::window::unowned_file_window(Some("browser"), &no_main).as_deref(),
            Some("editor-2")
        );
    }
}
