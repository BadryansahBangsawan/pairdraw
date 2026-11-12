//! A reading of the open page. The script runs on demand, changes nothing, and returns JSON the
//! app checks. It does not read cookies, storage, or request headers, and it is not an
//! initialization script.

use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Runtime};

use super::browser::{browser_window, eval_text, until_deadline};

const READ_PAGE: &str = include_str!("browser-read.js");
const READ_WAIT: Duration = Duration::from_secs(10);
const READ_EXPIRED: &str = "The page did not answer in time.";
const SELECTOR_LIMIT: usize = 500;

pub(crate) fn read_script(request: &str) -> String {
    format!("(() => {{\nconst __openpencilReadRequest = {request};\n{READ_PAGE}\n}})()")
}

fn read_request(kind: &str, selector: Option<&str>) -> String {
    let request = match selector {
        Some(selector) => json!({ "kind": kind, "selector": selector }).to_string(),
        None => json!({ "kind": kind }).to_string(),
    };
    read_script(&request)
}

async fn read_page<R: Runtime>(app: &AppHandle<R>, request: &str) -> Result<String, String> {
    let window = browser_window(app)?;
    until_deadline(eval_text(&window, request), READ_WAIT, READ_EXPIRED).await
}

/// Tag, role, text, and box for one CSS selector. The app checks the JSON; this only fetches it.
#[tauri::command]
pub async fn browser_read_element<R: Runtime>(
    app: AppHandle<R>,
    selector: String,
) -> Result<String, String> {
    if selector.is_empty() {
        return Err("The element is not on the page".to_owned());
    }
    if selector.len() > SELECTOR_LIMIT {
        return Err("The selector is too long.".to_owned());
    }
    read_page(&app, &read_request("element", Some(&selector))).await
}

/// Headings, links, buttons, and inputs on the open page. The app checks the JSON.
#[tauri::command]
pub async fn browser_read_outline<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    read_page(&app, &read_request("outline", None)).await
}

#[cfg(test)]
mod tests {
    use super::read_script;

    #[test]
    fn a_selector_stays_inside_the_json_request() {
        let selector = "a[href=\"x\"]});alert(1);//";
        let request = serde_json::json!({ "kind": "element", "selector": selector }).to_string();
        let script = read_script(&request);
        assert!(script.starts_with("(() => {"));
        assert!(script.contains(r#""selector":"a[href=\"x\"]});alert(1);//""#));
        assert!(!script.contains("alert(1);//\n"));
    }

    #[test]
    fn a_silent_read_ends_with_a_clear_error() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let result = super::super::browser::until_deadline(
                std::future::pending::<Result<String, String>>(),
                std::time::Duration::from_millis(20),
                "The page did not answer in time.",
            )
            .await;
            assert_eq!(result, Err("The page did not answer in time.".to_owned()));
        });
    }
}
