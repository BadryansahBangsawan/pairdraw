//! A page script whose answer is a promise. A webview hands back only what a script returns at
//! once, and WebKit refuses a promise as a result, so the script parks its answer on the page and
//! a short read collects it. The slot is a non-enumerable window property, removed once read.

use std::time::Duration;

use serde::Deserialize;
use tauri::{Runtime, WebviewWindow};

use super::browser::{eval_text, until_deadline};

const POLL_PAUSE: Duration = Duration::from_millis(100);

/// A slot name the page cannot guess: 16 random bytes from the OS CSPRNG, hex-encoded. Two
/// waits never read each other's answer, and a page cannot park a fake one in advance.
pub(crate) fn slot_name() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    getrandom::getrandom(&mut bytes).map_err(|error| error.to_string())?;
    let suffix: String = bytes.iter().map(|byte| format!("{byte:02x}")).collect();
    Ok(format!("__pairdrawAwait{suffix}"))
}

/// Starts `body`, the body of an async function, and returns before it settles. The function's
/// result, or the reason it failed, is kept in the window property `slot`.
pub(crate) fn start_script(slot: &str, body: &str) -> Result<String, String> {
    let slot = serde_json::to_string(slot).map_err(|error| error.to_string())?;
    Ok(format!(
        r#"(() => {{
const slot = {slot};
if (Object.prototype.hasOwnProperty.call(window, slot)) throw new Error("The page changed before it answered");
const parked = {{ state: "pending" }};
Object.defineProperty(window, slot, {{ value: parked, writable: false, configurable: true }});
const keep = (state) => Object.assign(parked, state);
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

/// Removes the slot whether or not the script settled, so a wait that ends early leaves nothing
/// parked on the page.
pub(crate) fn delete_script(slot: &str) -> Result<String, String> {
    let slot = serde_json::to_string(slot).map_err(|error| error.to_string())?;
    Ok(format!(
        r#"(() => {{
const slot = {slot};
delete window[slot];
return "";
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

/// The answer a read found: none yet, the script's text, or why there will be none. A report
/// longer than `limit` bytes is refused before it is parsed: a hostile page can park a string
/// of any size in the slot, and serde would allocate all of it.
pub(crate) fn read_outcome(reported: &str, limit: usize) -> Result<Option<String>, String> {
    if reported.len() > limit {
        return Err("The page returned too much".to_owned());
    }
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
/// `expired` is the sentence the caller shows when the page takes longer; `limit` bounds the
/// answer's reported size in bytes.
pub(crate) async fn eval_awaited<R: Runtime>(
    window: &WebviewWindow<R>,
    body: &str,
    wait: Duration,
    expired: &str,
    limit: usize,
) -> Result<String, String> {
    let slot = slot_name()?;
    let read = read_script(&slot)?;
    let answer = async {
        eval_text(window, &start_script(&slot, body)?).await?;
        loop {
            if let Some(value) = read_outcome(&eval_text(window, &read).await?, limit)? {
                return Ok(value);
            }
            tokio::time::sleep(POLL_PAUSE).await;
        }
    };
    let outcome = until_deadline(answer, wait, expired).await;
    if outcome.is_err() {
        // A timed-out or failed wait leaves its pending slot behind; remove it best-effort.
        if let Ok(script) = delete_script(&slot) {
            let _ = eval_text(window, &script).await;
        }
    }
    outcome
}

#[cfg(test)]
mod tests {
    use super::{delete_script, read_outcome, read_script, slot_name, start_script};

    #[test]
    fn a_slot_name_is_crypto_random_and_unique_per_call() {
        let first = slot_name().expect("name");
        let second = slot_name().expect("name");
        assert_ne!(first, second);
        let suffix = first.strip_prefix("__pairdrawAwait").expect("prefix");
        assert_eq!(suffix.len(), 32);
        assert!(suffix.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn the_start_script_refuses_a_slot_the_page_already_holds() {
        let script = start_script("slot-1", "").expect("script");
        assert!(script.contains("Object.prototype.hasOwnProperty.call(window, slot)"));
        assert!(script.contains("The page changed before it answered"));
    }

    #[test]
    fn the_slot_property_cannot_be_overwritten_by_assignment() {
        let script = start_script("slot-1", "").expect("script");
        assert!(script.contains("writable: false"));
        // The reader still deletes it, so the property stays configurable.
        assert!(script.contains("configurable: true"));
        // Updates mutate the parked object in place instead of redefining the property.
        assert!(script.contains("Object.assign"));
    }
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
        assert_eq!(read_outcome(r#"{"state":"pending"}"#, 1024), Ok(None));
        assert_eq!(
            read_outcome(r#"{"state":"done","value":"<p>hi</p>"}"#, 1024),
            Ok(Some("<p>hi</p>".to_owned()))
        );
        assert_eq!(
            read_outcome(r#"{"state":"failed","error":"boom"}"#, 1024),
            Err("boom".to_owned())
        );
        assert_eq!(
            read_outcome(r#"{"state":"gone"}"#, 1024),
            Err("The page changed before it answered".to_owned())
        );
        assert!(read_outcome("", 1024).is_err());
    }

    #[test]
    fn an_answer_over_the_limit_is_refused_before_it_is_parsed() {
        // A hostile page can park a string of any size straight in the slot; the reader must
        // refuse it on its reported length, before serde allocates the value.
        let huge = format!("{{\"state\":\"done\",\"value\":\"{}\"}}", "x".repeat(4096));
        assert_eq!(
            read_outcome(&huge, 1024),
            Err("The page returned too much".to_owned())
        );
        // At the limit the answer still arrives.
        let fits = format!("{{\"state\":\"done\",\"value\":\"{}\"}}", "x".repeat(900));
        assert!(read_outcome(&fits, 1024).is_ok());
        // A failed state's error text is bounded the same way.
        let huge_error = format!(
            "{{\"state\":\"failed\",\"error\":\"{}\"}}",
            "e".repeat(4096)
        );
        assert!(read_outcome(&huge_error, 1024).is_err());
    }

    #[test]
    fn a_timeout_leaves_a_delete_script_for_the_pending_slot() {
        let script = delete_script("slot-1").expect("script");
        assert!(script.contains("const slot = \"slot-1\";"));
        assert!(script.contains("delete window[slot]"));
        // The name is quoted the same way the other scripts quote it.
        assert!(delete_script("a\"b")
            .expect("quoted")
            .contains("const slot = \"a\\\"b\";"));
    }
}
