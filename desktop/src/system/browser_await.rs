//! A page script whose answer is a promise. A webview hands back only what a script returns at
//! once, and WebKit refuses a promise as a result, so the script parks its answer on the page and
//! a short read collects it. The slot is a non-enumerable window property, removed once read.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use serde::Deserialize;
use tauri::{Runtime, WebviewWindow};

use super::browser::{eval_text, until_deadline};

const POLL_PAUSE: Duration = Duration::from_millis(100);

/// Each awaited script gets a slot of its own, so two waits never read each other's answer.
static NEXT_SLOT: AtomicU64 = AtomicU64::new(0);

/// Starts `body`, the body of an async function, and returns before it settles. The function's
/// result, or the reason it failed, is kept in the window property `slot`.
pub(crate) fn start_script(slot: &str, body: &str) -> Result<String, String> {
    let slot = serde_json::to_string(slot).map_err(|error| error.to_string())?;
    Ok(format!(
        r#"(() => {{
const slot = {slot};
const keep = (state) => Object.defineProperty(window, slot, {{ value: state, configurable: true }});
keep({{ state: "pending" }});
(async () => {{
{body}
}})().then(
  (value) => keep(typeof value === "string" ? {{ state: "done", value }} : {{ state: "failed", error: "The page returned nothing" }}),
  (error) => keep({{ state: "failed", error: String((error && error.message) || error) }})
);
return "";
}})()"#
    ))
}

/// Reads the slot, and removes it once the script has settled.
pub(crate) fn read_script(slot: &str) -> Result<String, String> {
    let slot = serde_json::to_string(slot).map_err(|error| error.to_string())?;
    Ok(format!(
        r#"(() => {{
const slot = {slot};
const found = Object.getOwnPropertyDescriptor(window, slot);
if (!found) return JSON.stringify({{ state: "gone" }});
if (found.value.state !== "pending") delete window[slot];
return JSON.stringify(found.value);
}})()"#
    ))
}

#[derive(Deserialize)]
#[serde(tag = "state", rename_all = "lowercase")]
enum Slot {
    Pending,
    Done { value: String },
    Failed { error: String },
    Gone,
}

/// The answer a read found: none yet, the script's text, or why there will be none.
pub(crate) fn read_outcome(reported: &str) -> Result<Option<String>, String> {
    let slot: Slot =
        serde_json::from_str(reported).map_err(|_| "The page returned nothing".to_owned())?;
    match slot {
        Slot::Pending => Ok(None),
        Slot::Done { value } => Ok(Some(value)),
        Slot::Failed { error } => Err(error),
        Slot::Gone => Err("The page changed before it answered".to_owned()),
    }
}

/// Runs `body` as an async function in the page and waits up to `wait` for the text it returns.
/// `expired` is the sentence the caller shows when the page takes longer.
pub(crate) async fn eval_awaited<R: Runtime>(
    window: &WebviewWindow<R>,
    body: &str,
    wait: Duration,
    expired: &str,
) -> Result<String, String> {
    let slot = format!(
        "__pairdrawAwait{}",
        NEXT_SLOT.fetch_add(1, Ordering::Relaxed)
    );
    let read = read_script(&slot)?;
    let answer = async {
        eval_text(window, &start_script(&slot, body)?).await?;
        loop {
            if let Some(value) = read_outcome(&eval_text(window, &read).await?)? {
                return Ok(value);
            }
            tokio::time::sleep(POLL_PAUSE).await;
        }
    };
    until_deadline(answer, wait, expired).await
}

#[cfg(test)]
mod tests {
    use super::{read_outcome, read_script, start_script};

    #[test]
    fn the_start_script_returns_text_at_once_and_runs_the_body_as_an_async_function() {
        let script = start_script("slot-1", "return await Promise.resolve('x')").expect("script");
        assert!(script.contains("const slot = \"slot-1\";"));
        assert!(script.contains("(async () => {\nreturn await Promise.resolve('x')\n})()"));
        assert!(script.trim_end().ends_with("return \"\";\n})()"));
    }

    #[test]
    fn a_slot_name_is_quoted_into_both_scripts() {
        let name = "a\"b";
        assert!(start_script(name, "")
            .expect("start")
            .contains("const slot = \"a\\\"b\";"));
        assert!(read_script(name)
            .expect("read")
            .contains("const slot = \"a\\\"b\";"));
    }

    #[test]
    fn a_read_is_pending_done_failed_or_gone() {
        assert_eq!(read_outcome(r#"{"state":"pending"}"#), Ok(None));
        assert_eq!(
            read_outcome(r#"{"state":"done","value":"<p>hi</p>"}"#),
            Ok(Some("<p>hi</p>".to_owned()))
        );
        assert_eq!(
            read_outcome(r#"{"state":"failed","error":"boom"}"#),
            Err("boom".to_owned())
        );
        assert_eq!(
            read_outcome(r#"{"state":"gone"}"#),
            Err("The page changed before it answered".to_owned())
        );
        assert!(read_outcome("").is_err());
    }
}
