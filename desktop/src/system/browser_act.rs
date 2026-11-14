//! A change to the open page: click, type, press a key, scroll, or wait. Each call has a
//! deadline. A wait polls with short reads, because a page promise is not something this window
//! is known to finish. A click may navigate; the window's navigation rule still refuses the
//! addresses it already refuses. The script is not an initialization script, and it does not
//! read cookies, storage, or request headers.

use std::future::Future;
use std::time::{Duration, Instant};

use serde_json::json;
use tauri::{AppHandle, Runtime};

use super::browser::{browser_window, eval_text, until_deadline};

const ACT_PAGE: &str = include_str!("browser-act.js");
const ACT_WAIT: Duration = Duration::from_secs(10);
const PROBE_WAIT: Duration = Duration::from_secs(2);
const POLL_PAUSE: Duration = Duration::from_millis(100);
const EXPIRED: &str = "The action timed out.";
const SELECTOR_LIMIT: usize = 500;
const TEXT_LIMIT: usize = 2000;
const KEY_LIMIT: usize = 40;
const SCROLL_LIMIT: f64 = 10_000.0;
const OK: &str = "{\"code\":\"ok\"}";

pub(crate) fn act_script(request: &str) -> String {
    format!("(() => {{\nconst __pairdrawActRequest = {request};\n{ACT_PAGE}\n}})()")
}

/// Polls until `probe` is ready, the deadline passes, or one read never answers.
pub(crate) async fn poll_until<F, Fut>(
    mut probe: F,
    wait: Duration,
    pause: Duration,
    expired: &str,
) -> Result<(), String>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<bool, String>>,
{
    let start = Instant::now();
    loop {
        let elapsed = start.elapsed();
        if elapsed >= wait {
            return Err(expired.to_owned());
        }
        let probe_wait = PROBE_WAIT.min(wait.saturating_sub(elapsed));
        if probe_wait.is_zero() {
            return Err(expired.to_owned());
        }
        let ready = match tokio::time::timeout(probe_wait, probe()).await {
            Ok(result) => result?,
            Err(_) => return Err(expired.to_owned()),
        };
        if ready {
            return Ok(());
        }
        let after = start.elapsed();
        if after >= wait {
            return Err(expired.to_owned());
        }
        let nap = pause.min(wait.saturating_sub(after));
        if nap.is_zero() {
            return Err(expired.to_owned());
        }
        tokio::time::sleep(nap).await;
    }
}

fn selector_ok(selector: &str, required: bool) -> Result<(), String> {
    if required && selector.is_empty() {
        return Err("The element is not on the page".to_owned());
    }
    if selector.len() > SELECTOR_LIMIT {
        return Err("The selector is too long.".to_owned());
    }
    Ok(())
}

fn scroll_ok(dx: f64, dy: f64) -> Result<(), String> {
    if !dx.is_finite() || !dy.is_finite() || dx.abs() > SCROLL_LIMIT || dy.abs() > SCROLL_LIMIT {
        return Err("The scroll is too far.".to_owned());
    }
    Ok(())
}

async fn run_once<R: Runtime>(
    window: &tauri::WebviewWindow<R>,
    request: String,
) -> Result<String, String> {
    until_deadline(eval_text(window, &act_script(&request)), ACT_WAIT, EXPIRED).await
}

async fn probe_text<R: Runtime>(
    window: &tauri::WebviewWindow<R>,
    request: String,
) -> Result<String, String> {
    until_deadline(
        eval_text(window, &act_script(&request)),
        PROBE_WAIT,
        EXPIRED,
    )
    .await
}

/// Click, type, press a key, scroll, or wait. The app checks the JSON a change returns.
#[tauri::command]
pub async fn browser_act<R: Runtime>(
    app: AppHandle<R>,
    kind: String,
    selector: String,
    text: String,
    key: String,
    dx: f64,
    dy: f64,
) -> Result<String, String> {
    let window = browser_window(&app)?;
    match kind.as_str() {
        "click" => {
            selector_ok(&selector, true)?;
            run_once(
                &window,
                json!({ "kind": "click", "selector": selector }).to_string(),
            )
            .await
        }
        "type" => {
            selector_ok(&selector, true)?;
            if text.len() > TEXT_LIMIT {
                return Err("The text is too long.".to_owned());
            }
            run_once(
                &window,
                json!({ "kind": "type", "selector": selector, "text": text }).to_string(),
            )
            .await
        }
        "key" => {
            selector_ok(&selector, true)?;
            if key.is_empty() {
                return Err("The key is missing.".to_owned());
            }
            if key.len() > KEY_LIMIT {
                return Err("The key is too long.".to_owned());
            }
            run_once(
                &window,
                json!({ "kind": "key", "selector": selector, "key": key }).to_string(),
            )
            .await
        }
        "scroll" => {
            selector_ok(&selector, true)?;
            scroll_ok(dx, dy)?;
            run_once(
                &window,
                json!({ "kind": "scroll", "selector": selector, "dx": dx, "dy": dy }).to_string(),
            )
            .await
        }
        "wait-selector" => {
            selector_ok(&selector, true)?;
            let request = json!({ "kind": "probe-selector", "selector": selector }).to_string();
            poll_until(
                || {
                    let window = window.clone();
                    let request = request.clone();
                    async move { Ok(probe_text(&window, request).await? == "yes") }
                },
                ACT_WAIT,
                POLL_PAUSE,
                EXPIRED,
            )
            .await?;
            Ok(OK.to_owned())
        }
        "wait-navigation" => {
            let request = json!({ "kind": "probe-href" }).to_string();
            let started = probe_text(&window, request.clone()).await?;
            poll_until(
                || {
                    let window = window.clone();
                    let request = request.clone();
                    let started = started.clone();
                    async move { Ok(probe_text(&window, request).await? != started) }
                },
                ACT_WAIT,
                POLL_PAUSE,
                EXPIRED,
            )
            .await?;
            Ok(OK.to_owned())
        }
        _ => Err("The action is not one the browser can run.".to_owned()),
    }
}

#[cfg(test)]
mod tests {
    use super::{act_script, poll_until, EXPIRED};

    #[test]
    fn typed_text_stays_inside_the_json_request() {
        let text = "a\"});alert(1);//";
        let request =
            serde_json::json!({ "kind": "type", "selector": "#q", "text": text }).to_string();
        let script = act_script(&request);
        assert!(script.starts_with("(() => {"));
        assert!(script.contains(r#""text":"a\"});alert(1);//""#));
        assert!(!script.contains("alert(1);//\n"));
    }

    #[test]
    fn a_wait_that_never_happens_ends_and_the_next_call_still_runs() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .expect("runtime");
        runtime.block_on(async {
            let missed = poll_until(
                || async { Ok(false) },
                std::time::Duration::from_millis(30),
                std::time::Duration::from_millis(5),
                EXPIRED,
            )
            .await;
            assert_eq!(missed, Err(EXPIRED.to_owned()));
            let next = poll_until(
                || async { Ok(true) },
                std::time::Duration::from_secs(1),
                std::time::Duration::from_millis(1),
                EXPIRED,
            )
            .await;
            assert_eq!(next, Ok(()));
        });
    }
}
