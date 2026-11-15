//! Receives sign-in redirects on a loopback port, listening for the single request that carries
//! the authorization code, then closing the port. OpenAI registers one redirect for the Codex
//! client, `http://localhost:1455/auth/callback`, so ChatGPT returns there; OpenRouter accepts a
//! localhost callback on any port, so it returns to a port the system picks.

use std::io::{ErrorKind, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use url::Url;

/// Where a provider's redirect returns.
#[derive(Debug, Clone, Copy)]
struct Callback {
    address: &'static str,
    path: &'static str,
}

const CHATGPT_CALLBACK: Callback = Callback {
    address: "127.0.0.1:1455",
    path: "/auth/callback",
};
/// Port 0 lets the system pick a free port, which the redirect URL then names.
const OPENROUTER_CALLBACK: Callback = Callback {
    address: "127.0.0.1:0",
    path: "/oauth/openrouter",
};
/// Codes expire after ten minutes; a sign-in left open longer has to start again.
const WAIT_LIMIT: Duration = Duration::from_secs(10 * 60);
const POLL_INTERVAL: Duration = Duration::from_millis(100);
/// A previous sign-in releases the port within one poll after it is cancelled.
const REBIND_LIMIT: Duration = Duration::from_millis(500);
const READ_TIMEOUT: Duration = Duration::from_secs(5);
const MAX_REQUEST_BYTES: usize = 16 * 1024;

/// What the browser tab shows after the redirect, in the app's language.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallbackPages {
    signed_in: String,
    cancelled: String,
    stale: String,
}

struct Pending {
    listener: TcpListener,
    path: &'static str,
    state: String,
    pages: CallbackPages,
    cancelled: Arc<AtomicBool>,
}

/// The listener between a provider's `*_oauth_listen` and `*_oauth_wait`, and the flag that
/// cancels whichever wait is running.
struct Loopback {
    callback: Callback,
    pending: Mutex<Option<Pending>>,
    /// The attempt listening or waiting, by its state, and the flag that cancels it.
    current: Mutex<Option<(String, Arc<AtomicBool>)>>,
}

/// The ChatGPT sign-in's loopback, on the port OpenAI registers.
pub struct ChatGPTOAuthLoopback(Loopback);

impl Default for ChatGPTOAuthLoopback {
    fn default() -> Self {
        Self(Loopback::new(CHATGPT_CALLBACK))
    }
}

/// The OpenRouter sign-in's loopback, on a port the system picks.
pub struct OpenRouterOAuthLoopback(Loopback);

impl Default for OpenRouterOAuthLoopback {
    fn default() -> Self {
        Self(Loopback::new(OPENROUTER_CALLBACK))
    }
}

#[derive(Debug, PartialEq, Eq, serde::Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum LoopbackOutcome {
    Code { code: String },
    Denied,
    Expired,
    Cancelled,
}

#[derive(Debug, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum LoopbackError {
    /// Another program, usually `codex login`, holds ChatGPT's port 1455.
    PortInUse,
    NotListening,
    Failed,
}

#[derive(Debug, PartialEq, Eq)]
enum CallbackRequest {
    Code(String),
    Denied,
    Mismatch,
    Other,
}

/// Reads the request target of a redirect: a code for this attempt, a refusal, or noise.
fn callback_request(target: &str, path: &str, state: &str) -> CallbackRequest {
    let Ok(url) = Url::parse(&format!("http://localhost{target}")) else {
        return CallbackRequest::Other;
    };
    if url.path() != path {
        return CallbackRequest::Other;
    }
    let param = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };
    if param("state").as_deref() != Some(state) {
        return CallbackRequest::Mismatch;
    }
    match param("code") {
        Some(code) if !code.is_empty() => CallbackRequest::Code(code),
        _ => CallbackRequest::Denied,
    }
}

/// Headers a browser sends with the redirect; more than this reads as noise.
const MAX_REQUEST_HEADERS: usize = 64;

/// The target of a GET request such as `GET /auth/callback?code=… HTTP/1.1`.
fn request_target(head: &str) -> Option<&str> {
    let mut headers = [httparse::EMPTY_HEADER; MAX_REQUEST_HEADERS];
    let mut request = httparse::Request::new(&mut headers);
    // A request cut off before its blank line can still fill in the method and path.
    if !request.parse(head.as_bytes()).ok()?.is_complete() {
        return None;
    }
    request.method.filter(|method| *method == "GET")?;
    request.path
}

fn read_head(stream: &mut TcpStream) -> Option<String> {
    stream.set_nonblocking(false).ok()?;
    stream.set_read_timeout(Some(READ_TIMEOUT)).ok()?;
    let mut head = Vec::new();
    let mut buffer = [0; 1024];
    while !head.windows(4).any(|window| window == b"\r\n\r\n") {
        let read = stream.read(&mut buffer).ok()?;
        if read == 0 || head.len() + read > MAX_REQUEST_BYTES {
            break;
        }
        head.extend_from_slice(&buffer[..read]);
    }
    String::from_utf8(head).ok()
}

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn respond(stream: &mut TcpStream, status: &str, message: &str) {
    let message = escape_html(message);
    let body = format!(
        "<!doctype html><meta charset=\"utf-8\"><title>Pairdraw</title>\
         <p style=\"font:16px system-ui;margin:48px auto;max-width:480px\">{message}</p>"
    );
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\n\
         Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
}

fn bind(address: &str) -> Result<TcpListener, LoopbackError> {
    let started = Instant::now();
    loop {
        match TcpListener::bind(address) {
            Ok(listener) => return Ok(listener),
            Err(error) if error.kind() == ErrorKind::AddrInUse => {
                if started.elapsed() >= REBIND_LIMIT {
                    return Err(LoopbackError::PortInUse);
                }
                std::thread::sleep(POLL_INTERVAL);
            }
            Err(_) => return Err(LoopbackError::Failed),
        }
    }
}

fn wait(pending: Pending) -> Result<LoopbackOutcome, LoopbackError> {
    let Pending {
        listener,
        path,
        state,
        pages,
        cancelled,
    } = pending;
    listener
        .set_nonblocking(true)
        .map_err(|_| LoopbackError::Failed)?;
    let started = Instant::now();
    loop {
        if cancelled.load(Ordering::SeqCst) {
            return Ok(LoopbackOutcome::Cancelled);
        }
        if started.elapsed() >= WAIT_LIMIT {
            return Ok(LoopbackOutcome::Expired);
        }
        let mut stream = match listener.accept() {
            Ok((stream, _)) => stream,
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                std::thread::sleep(POLL_INTERVAL);
                continue;
            }
            Err(_) => return Err(LoopbackError::Failed),
        };
        let request = read_head(&mut stream)
            .as_deref()
            .and_then(request_target)
            .map(|target| callback_request(target, path, &state))
            .unwrap_or(CallbackRequest::Other);
        match request {
            CallbackRequest::Code(code) => {
                respond(&mut stream, "200 OK", &pages.signed_in);
                return Ok(LoopbackOutcome::Code { code });
            }
            CallbackRequest::Denied => {
                respond(&mut stream, "200 OK", &pages.cancelled);
                return Ok(LoopbackOutcome::Denied);
            }
            CallbackRequest::Mismatch => respond(&mut stream, "400 Bad Request", &pages.stale),
            CallbackRequest::Other => respond(&mut stream, "404 Not Found", ""),
        }
    }
}

impl Loopback {
    fn new(callback: Callback) -> Self {
        Self {
            callback,
            pending: Mutex::new(None),
            current: Mutex::new(None),
        }
    }

    /// Takes the port before the browser opens, so a busy port is reported instead of a redirect
    /// that never arrives, and returns its number. A sign-in still waiting is cancelled.
    async fn listen(&self, state: String, pages: CallbackPages) -> Result<u16, LoopbackError> {
        let cancelled = Arc::new(AtomicBool::new(false));
        if let Some((_, previous)) = self
            .current
            .lock()
            .map_err(|_| LoopbackError::Failed)?
            .replace((state.clone(), cancelled.clone()))
        {
            previous.store(true, Ordering::SeqCst);
        }
        // A listener taken but never waited on still holds the port.
        self.pending
            .lock()
            .map_err(|_| LoopbackError::Failed)?
            .take();
        let address = self.callback.address;
        let listener = tauri::async_runtime::spawn_blocking(move || bind(address))
            .await
            .map_err(|_| LoopbackError::Failed)??;
        // Cancelled while binding: drop the port rather than hold it for an attempt that is over.
        if cancelled.load(Ordering::SeqCst) {
            return Err(LoopbackError::Failed);
        }
        let port = listener
            .local_addr()
            .map_err(|_| LoopbackError::Failed)?
            .port();
        *self.pending.lock().map_err(|_| LoopbackError::Failed)? = Some(Pending {
            listener,
            path: self.callback.path,
            state,
            pages,
            cancelled,
        });
        Ok(port)
    }

    /// Waits for the redirect on the port `listen` took, then releases it.
    async fn wait(&self) -> Result<LoopbackOutcome, LoopbackError> {
        let pending = self
            .pending
            .lock()
            .map_err(|_| LoopbackError::Failed)?
            .take()
            .ok_or(LoopbackError::NotListening)?;
        tauri::async_runtime::spawn_blocking(move || wait(pending))
            .await
            .map_err(|_| LoopbackError::Failed)?
    }

    /// Cancels the attempt with this state. A late cancel from an earlier attempt leaves a newer
    /// one alone.
    fn cancel(&self, state: &str) {
        if let Ok(mut current) = self.current.lock() {
            if current.as_ref().is_some_and(|(owner, _)| owner == state) {
                if let Some((_, flag)) = current.take() {
                    flag.store(true, Ordering::SeqCst);
                }
            }
        }
        if let Ok(mut pending) = self.pending.lock() {
            if pending
                .as_ref()
                .is_some_and(|listening| listening.state == state)
            {
                pending.take();
            }
        }
    }
}

#[tauri::command]
pub async fn chatgpt_oauth_listen(
    loopback: tauri::State<'_, ChatGPTOAuthLoopback>,
    state: String,
    pages: CallbackPages,
) -> Result<u16, LoopbackError> {
    loopback.0.listen(state, pages).await
}

#[tauri::command]
pub async fn chatgpt_oauth_wait(
    loopback: tauri::State<'_, ChatGPTOAuthLoopback>,
) -> Result<LoopbackOutcome, LoopbackError> {
    loopback.0.wait().await
}

#[tauri::command]
pub fn chatgpt_oauth_cancel(loopback: tauri::State<'_, ChatGPTOAuthLoopback>, state: String) {
    loopback.0.cancel(&state);
}

/// Returns the port the redirect URL names, `http://localhost:<port>/oauth/openrouter`.
#[tauri::command]
pub async fn openrouter_oauth_listen(
    loopback: tauri::State<'_, OpenRouterOAuthLoopback>,
    state: String,
    pages: CallbackPages,
) -> Result<u16, LoopbackError> {
    loopback.0.listen(state, pages).await
}

#[tauri::command]
pub async fn openrouter_oauth_wait(
    loopback: tauri::State<'_, OpenRouterOAuthLoopback>,
) -> Result<LoopbackOutcome, LoopbackError> {
    loopback.0.wait().await
}

#[tauri::command]
pub fn openrouter_oauth_cancel(loopback: tauri::State<'_, OpenRouterOAuthLoopback>, state: String) {
    loopback.0.cancel(&state);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_code_for_this_attempt() {
        assert_eq!(
            callback_request(
                "/auth/callback?code=abc%2B1&state=s1",
                CHATGPT_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Code("abc+1".into())
        );
    }

    #[test]
    fn rejects_another_attempts_state() {
        assert_eq!(
            callback_request(
                "/auth/callback?code=abc&state=old",
                CHATGPT_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Mismatch
        );
        assert_eq!(
            callback_request("/auth/callback?code=abc", CHATGPT_CALLBACK.path, "s1"),
            CallbackRequest::Mismatch
        );
    }

    #[test]
    fn treats_a_redirect_without_a_code_as_denied() {
        assert_eq!(
            callback_request(
                "/auth/callback?error=access_denied&state=s1",
                CHATGPT_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Denied
        );
    }

    #[test]
    fn ignores_other_paths() {
        assert_eq!(
            callback_request("/favicon.ico", CHATGPT_CALLBACK.path, "s1"),
            CallbackRequest::Other
        );
        assert_eq!(
            callback_request(
                "/auth/callback/extra?code=a&state=s1",
                CHATGPT_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Other
        );
    }

    #[test]
    fn a_late_cancel_leaves_a_newer_attempt_alone() {
        let loopback = Loopback::new(CHATGPT_CALLBACK);
        let newer = Arc::new(AtomicBool::new(false));
        *loopback.current.lock().unwrap() = Some(("s2".into(), newer.clone()));
        *loopback.pending.lock().unwrap() = Some(Pending {
            listener: TcpListener::bind("127.0.0.1:0").unwrap(),
            path: CHATGPT_CALLBACK.path,
            state: "s2".into(),
            pages: CallbackPages {
                signed_in: String::new(),
                cancelled: String::new(),
                stale: String::new(),
            },
            cancelled: newer.clone(),
        });

        loopback.cancel("s1");
        assert!(!newer.load(Ordering::SeqCst));
        assert!(loopback.pending.lock().unwrap().is_some());

        loopback.cancel("s2");
        assert!(newer.load(Ordering::SeqCst));
        assert!(loopback.pending.lock().unwrap().is_none());
    }

    #[test]
    fn reads_openrouter_redirects_on_their_own_path() {
        assert_eq!(
            callback_request(
                "/oauth/openrouter?code=abc&state=s1",
                OPENROUTER_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Code("abc".into())
        );
        assert_eq!(
            callback_request(
                "/auth/callback?code=abc&state=s1",
                OPENROUTER_CALLBACK.path,
                "s1"
            ),
            CallbackRequest::Other
        );
    }

    #[test]
    fn openrouter_listens_on_a_port_the_system_picks() {
        let listener = bind(OPENROUTER_CALLBACK.address).unwrap();
        assert_ne!(listener.local_addr().unwrap().port(), 0);
    }

    #[test]
    fn escapes_page_text() {
        assert_eq!(
            escape_html("<b>\"Tom & Jerry\"</b>"),
            "&lt;b&gt;&quot;Tom &amp; Jerry&quot;&lt;/b&gt;"
        );
    }

    #[test]
    fn reads_only_get_request_targets() {
        assert_eq!(
            request_target("GET /auth/callback?code=a HTTP/1.1\r\nHost: localhost\r\n\r\n"),
            Some("/auth/callback?code=a")
        );
        assert_eq!(request_target("POST /auth/callback HTTP/1.1\r\n\r\n"), None);
        assert_eq!(request_target(""), None);
        assert_eq!(request_target("GET /auth/callback?code=a\r\n\r\n"), None);
        assert_eq!(request_target("GET /auth/callback?code=a&state=s1 "), None);
        assert_eq!(
            request_target("GET /auth/callback?code=a HTTP/1.1\r\nHost: localhost\r\n"),
            None
        );
    }
}
