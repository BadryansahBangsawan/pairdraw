//! A temporary outline on one element of the open page. The script runs on demand, draws a box
//! the page can see, and removes it again. It does not read cookies, storage, or request headers,
//! and it is not an initialization script.

use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Runtime};

use super::browser::{browser_window, eval_text, until_deadline};

const MARK_PAGE: &str = include_str!("browser-mark.js");
const MARK_WAIT: Duration = Duration::from_secs(10);
const MARK_EXPIRED: &str = "The page did not answer in time.";
const SELECTOR_LIMIT: usize = 500;

pub(crate) fn mark_script(request: &str) -> String {
    format!("(() => {{\nconst __pairdrawMarkRequest = {request};\n{MARK_PAGE}\n}})()")
}

fn mark_request(selector: &str) -> String {
    let request = if selector.is_empty() {
        json!({ "action": "clear" }).to_string()
    } else {
        json!({ "action": "show", "selector": selector }).to_string()
    };
    mark_script(&request)
}

/// Draws or removes the hover outline. An empty selector removes it.
#[tauri::command]
pub async fn browser_mark_element<R: Runtime>(
    app: AppHandle<R>,
    selector: String,
) -> Result<String, String> {
    if selector.len() > SELECTOR_LIMIT {
        return Err("The selector is too long.".to_owned());
    }
    let window = browser_window(&app)?;
    until_deadline(
        eval_text(&window, &mark_request(&selector)),
        MARK_WAIT,
        MARK_EXPIRED,
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::mark_script;

    #[test]
    fn a_selector_stays_inside_the_json_request() {
        let selector = "a[href=\"x\"]});alert(1);//";
        let request = serde_json::json!({ "action": "show", "selector": selector }).to_string();
        let script = mark_script(&request);
        assert!(script.starts_with("(() => {"));
        assert!(script.contains(r#""selector":"a[href=\"x\"]});alert(1);//""#));
        assert!(!script.contains("alert(1);//\n"));
    }

    #[test]
    fn a_silent_mark_ends_with_a_clear_error() {
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
