//! Local MCP servers for the built-in chat: processes the person approved, which speak
//! newline-delimited JSON-RPC on stdin and stdout (the MCP stdio transport).
//!
//! The shell scope pins every command line the webview may run (`desktop/AGENTS.md`); a local
//! MCP server's command line is the person's own, so instead each one runs only after the
//! person approved that exact program, its arguments, and the names of its variables in a
//! native dialog the webview cannot answer. Variables that choose the program or load code
//! into it are refused, since their values may change after the approval.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

mod dialog;

use dialog::dialog;

const APPROVALS_FILE: &str = "mcp-stdio-approvals.json";
const MAX_COMMAND_LENGTH: usize = 1024;
const MAX_ARGUMENTS: usize = 64;
const MAX_ARGUMENT_LENGTH: usize = 4096;
const MAX_ENV_VARIABLES: usize = 32;
const MAX_ENV_NAME_LENGTH: usize = 128;
const MAX_ENV_VALUE_LENGTH: usize = 4096;
/// A line longer than this is not a message any server sends; it is dropped.
const MAX_LINE_BYTES: usize = 32 * 1024 * 1024;
/// Keeps a chatty server's stderr from flooding the app's log.
const MAX_STDERR_LINE: usize = 2048;

/// Matches `BLOCKED_ENV_NAMES` in `src/app/integrations/mcp/stdio/env.ts`.
const BLOCKED_ENV_NAMES: &[&str] = &[
    "PATH",
    "PATHEXT",
    "COMSPEC",
    "NODE_OPTIONS",
    "NODE_PATH",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "LD_AUDIT",
    "PYTHONSTARTUP",
    "PYTHONPATH",
    "PYTHONHOME",
    "BASH_ENV",
    "ENV",
    "PERL5OPT",
    "PERL5LIB",
    "RUBYOPT",
    "RUBYLIB",
    "JAVA_TOOL_OPTIONS",
    "_JAVA_OPTIONS",
];

#[derive(Debug, Clone, Deserialize)]
pub struct McpStdioEnvVar {
    name: String,
    value: String,
}

/// A local MCP server's command line, as the webview asks to approve or run it.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStdioRequest {
    connection_id: String,
    name: String,
    command: String,
    args: Vec<String>,
    env: Vec<McpStdioEnvVar>,
    /// The app's language; only picks one of the shell's own translations below.
    locale: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum McpStdioEvent {
    Message { line: String },
    Exit { code: Option<i32> },
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum McpStdioError {
    /// The person did not allow the command line.
    Declined,
    /// No program by that name is on the search path.
    NotFound,
    Invalid {
        message: String,
    },
    Failed {
        message: String,
    },
}

impl McpStdioError {
    fn invalid(message: impl Into<String>) -> Self {
        Self::Invalid {
            message: message.into(),
        }
    }

    fn failed(message: impl Into<String>) -> Self {
        Self::Failed {
            message: message.into(),
        }
    }
}

/// One approved command line: the program as found on disk, its arguments, and its variables'
/// names, sorted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Approval {
    program: String,
    args: Vec<String>,
    env_names: Vec<String>,
}

struct Process {
    stdin: Mutex<Option<ChildStdin>>,
    child: Mutex<Child>,
}

/// The running local servers by handle, and the lock that keeps approvals from racing.
#[derive(Default)]
pub struct McpStdioProcesses {
    next: AtomicU32,
    running: Mutex<HashMap<u32, Arc<Process>>>,
    approvals: Mutex<()>,
}

fn allowed_env_name(name: &str) -> bool {
    let mut chars = name.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if name.len() > MAX_ENV_NAME_LENGTH || !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    if !chars.all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return false;
    }
    let upper = name.to_ascii_uppercase();
    !BLOCKED_ENV_NAMES.contains(&upper.as_str()) && !upper.starts_with("DYLD_")
}

fn validate(request: &McpStdioRequest) -> Result<(), McpStdioError> {
    let command = request.command.trim();
    if command.is_empty() || command.len() > MAX_COMMAND_LENGTH {
        return Err(McpStdioError::invalid("The command is empty or too long"));
    }
    if request.args.len() > MAX_ARGUMENTS
        || request
            .args
            .iter()
            .any(|arg| arg.len() > MAX_ARGUMENT_LENGTH)
    {
        return Err(McpStdioError::invalid("Too many or too long arguments"));
    }
    if request.env.len() > MAX_ENV_VARIABLES {
        return Err(McpStdioError::invalid("Too many environment variables"));
    }
    for variable in &request.env {
        if !allowed_env_name(&variable.name) || variable.value.len() > MAX_ENV_VALUE_LENGTH {
            return Err(McpStdioError::invalid(format!(
                "The environment variable {} is not allowed",
                variable.name
            )));
        }
    }
    let mut texts = std::iter::once(command)
        .chain(request.args.iter().map(String::as_str))
        .chain(request.env.iter().map(|v| v.value.as_str()));
    if texts.any(|text| text.contains('\0')) {
        return Err(McpStdioError::invalid(
            "The command line contains a NUL byte",
        ));
    }
    Ok(())
}

fn approval_for(program: &Path, request: &McpStdioRequest) -> Approval {
    let mut env_names: Vec<String> = request.env.iter().map(|v| v.name.clone()).collect();
    env_names.sort();
    env_names.dedup();
    Approval {
        program: program.display().to_string(),
        args: request.args.clone(),
        env_names,
    }
}

fn read_approvals(path: &Path) -> Vec<Approval> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn write_approvals(path: &Path, approvals: &[Approval]) -> Result<(), McpStdioError> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| McpStdioError::failed(e.to_string()))?;
    }
    let text = serde_json::to_string_pretty(approvals)
        .map_err(|e| McpStdioError::failed(e.to_string()))?;
    std::fs::write(path, text).map_err(|e| McpStdioError::failed(e.to_string()))
}

fn approvals_path(app: &AppHandle) -> Result<PathBuf, McpStdioError> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(APPROVALS_FILE))
        .map_err(|e| McpStdioError::failed(e.to_string()))
}

/// Asks once per command line; a yes is remembered, a no is asked again next time.
fn ensure_approved(
    app: &AppHandle,
    processes: &McpStdioProcesses,
    request: &McpStdioRequest,
    approval: &Approval,
) -> Result<(), McpStdioError> {
    let _guard = processes
        .approvals
        .lock()
        .map_err(|_| McpStdioError::failed("approvals lock poisoned"))?;
    let path = approvals_path(app)?;
    let mut approvals = read_approvals(&path);
    if approvals.contains(approval) {
        return Ok(());
    }
    let shown = dialog(&app.package_info().name, request, approval);
    let allowed = app
        .dialog()
        .message(shown.text)
        .title(shown.title)
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom(
            shown.run.to_owned(),
            shown.cancel.to_owned(),
        ))
        .blocking_show();
    if !allowed {
        return Err(McpStdioError::Declined);
    }
    approvals.push(approval.clone());
    write_approvals(&path, &approvals)
}

/// Reads stdout line by line into the channel; on its end, reports how the process exited.
fn pump_stdout(
    app: AppHandle,
    handle: u32,
    process: Arc<Process>,
    stdout: impl Read,
    on_event: Channel<McpStdioEvent>,
) {
    let mut reader = BufReader::new(stdout);
    let mut buffer = Vec::new();
    loop {
        buffer.clear();
        match reader.read_until(b'\n', &mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(_) if buffer.len() > MAX_LINE_BYTES => continue,
            Ok(_) => {
                let line = String::from_utf8_lossy(&buffer).trim_end().to_owned();
                if !line.is_empty() && on_event.send(McpStdioEvent::Message { line }).is_err() {
                    break;
                }
            }
        }
    }
    if let Ok(mut running) = app.state::<McpStdioProcesses>().running.lock() {
        running.remove(&handle);
    }
    let code = process.child.lock().ok().and_then(|mut child| {
        let _ = child.kill();
        child.wait().ok().and_then(|status| status.code())
    });
    let _ = on_event.send(McpStdioEvent::Exit { code });
}

fn pump_stderr(name: String, stderr: impl Read) {
    let reader = BufReader::new(stderr);
    for line in reader.split(b'\n').map_while(Result::ok) {
        let text = String::from_utf8_lossy(&line);
        let shown: String = text.chars().take(MAX_STDERR_LINE).collect();
        eprintln!("[MCP {name}] {shown}");
    }
}

/// Validates the request, finds its program, and asks the person unless they approved this
/// exact command line before; resolves the program's path.
fn approved_program(app: &AppHandle, request: &McpStdioRequest) -> Result<PathBuf, McpStdioError> {
    validate(request)?;
    // Found on the search path the shell augments at startup, as agents are.
    let program = which::which(request.command.trim()).map_err(|_| McpStdioError::NotFound)?;
    let processes = app.state::<McpStdioProcesses>();
    let approval = approval_for(&program, request);
    ensure_approved(app, &processes, request, &approval)?;
    Ok(program)
}

fn spawn_process(
    app: AppHandle,
    request: McpStdioRequest,
    on_event: Channel<McpStdioEvent>,
) -> Result<u32, McpStdioError> {
    let program = approved_program(&app, &request)?;
    let processes = app.state::<McpStdioProcesses>();

    let mut command = Command::new(&program);
    command
        .args(&request.args)
        .envs(
            request
                .env
                .iter()
                .map(|v| (v.name.as_str(), v.value.as_str())),
        )
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Ok(home) = app.path().home_dir() {
        command.current_dir(home);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW: a console server must not open a terminal window.
        command.creation_flags(0x0800_0000);
    }
    let mut child = command
        .spawn()
        .map_err(|e| McpStdioError::failed(e.to_string()))?;
    let (Some(stdin), Some(stdout), Some(stderr)) =
        (child.stdin.take(), child.stdout.take(), child.stderr.take())
    else {
        let _ = child.kill();
        return Err(McpStdioError::failed("The process has no standard streams"));
    };

    let handle = processes.next.fetch_add(1, Ordering::Relaxed) + 1;
    let process = Arc::new(Process {
        stdin: Mutex::new(Some(stdin)),
        child: Mutex::new(child),
    });
    processes
        .running
        .lock()
        .map_err(|_| McpStdioError::failed("process table lock poisoned"))?
        .insert(handle, process.clone());

    let name = format!("{} ({})", request.name, request.connection_id);
    std::thread::spawn(move || pump_stderr(name, stderr));
    std::thread::spawn(move || pump_stdout(app, handle, process, stdout, on_event));
    Ok(handle)
}

/// Starts a local MCP server after the person approved its command line; resolves its handle.
/// Its stdout lines and its exit arrive on `on_event`.
#[tauri::command]
pub async fn mcp_stdio_spawn(
    app: AppHandle,
    request: McpStdioRequest,
    on_event: Channel<McpStdioEvent>,
) -> Result<u32, McpStdioError> {
    // The approval dialog blocks, which must never happen on the main thread.
    tauri::async_runtime::spawn_blocking(move || spawn_process(app, request, on_event))
        .await
        .map_err(|e| McpStdioError::failed(e.to_string()))?
}

/// Asks the person to approve a command line a coding agent will start itself, as it does for
/// the local MCP servers the app passes it; resolves the approved program's path, which the
/// agent then runs instead of searching for the command again.
#[tauri::command]
pub async fn mcp_stdio_approve(
    app: AppHandle,
    request: McpStdioRequest,
) -> Result<String, McpStdioError> {
    tauri::async_runtime::spawn_blocking(move || {
        approved_program(&app, &request).map(|program| program.display().to_string())
    })
    .await
    .map_err(|e| McpStdioError::failed(e.to_string()))?
}

fn running(app: &AppHandle, handle: u32) -> Option<Arc<Process>> {
    app.state::<McpStdioProcesses>()
        .running
        .lock()
        .ok()
        .and_then(|running| running.get(&handle).cloned())
}

/// Writes one JSON-RPC message to the server's stdin, ending it with a newline.
#[tauri::command]
pub async fn mcp_stdio_write(
    app: AppHandle,
    handle: u32,
    line: String,
) -> Result<(), McpStdioError> {
    let process = running(&app, handle).ok_or_else(|| McpStdioError::failed("not running"))?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut stdin = process
            .stdin
            .lock()
            .map_err(|_| McpStdioError::failed("stdin lock poisoned"))?;
        let pipe = stdin
            .as_mut()
            .ok_or_else(|| McpStdioError::failed("stdin is closed"))?;
        let mut bytes = line.into_bytes();
        if bytes.last() != Some(&b'\n') {
            bytes.push(b'\n');
        }
        pipe.write_all(&bytes)
            .and_then(|()| pipe.flush())
            .map_err(|e| McpStdioError::failed(e.to_string()))
    })
    .await
    .map_err(|e| McpStdioError::failed(e.to_string()))?
}

/// Stops the server: closes its stdin, then kills it; its exit event follows on its channel.
#[tauri::command]
pub async fn mcp_stdio_close(app: AppHandle, handle: u32) -> Result<(), McpStdioError> {
    let Some(process) = running(&app, handle) else {
        return Ok(());
    };
    tauri::async_runtime::spawn_blocking(move || {
        if let Ok(mut stdin) = process.stdin.lock() {
            stdin.take();
        }
        if let Ok(mut child) = process.child.lock() {
            let _ = child.kill();
        }
    })
    .await
    .map_err(|e| McpStdioError::failed(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    pub(super) fn request(command: &str, args: &[&str], env: &[(&str, &str)]) -> McpStdioRequest {
        McpStdioRequest {
            connection_id: "mcp-test".into(),
            name: "Test".into(),
            command: command.into(),
            args: args.iter().map(|a| (*a).to_owned()).collect(),
            env: env
                .iter()
                .map(|(name, value)| McpStdioEnvVar {
                    name: (*name).into(),
                    value: (*value).into(),
                })
                .collect(),
            locale: "en".into(),
        }
    }

    #[test]
    fn allows_plain_names_and_refuses_ones_that_load_code() {
        assert!(allowed_env_name("GITHUB_TOKEN"));
        assert!(allowed_env_name("_private1"));
        assert!(!allowed_env_name("PATH"));
        assert!(!allowed_env_name("node_options"));
        assert!(!allowed_env_name("DYLD_INSERT_LIBRARIES"));
        assert!(!allowed_env_name("1TOKEN"));
        assert!(!allowed_env_name("A-B"));
        assert!(!allowed_env_name(""));
    }

    #[test]
    fn refuses_malformed_requests() {
        assert!(validate(&request("npx", &["-y", "server"], &[("API_KEY", "x")])).is_ok());
        assert!(matches!(
            validate(&request("  ", &[], &[])),
            Err(McpStdioError::Invalid { .. })
        ));
        assert!(matches!(
            validate(&request("npx", &[], &[("LD_PRELOAD", "/tmp/x.so")])),
            Err(McpStdioError::Invalid { .. })
        ));
        assert!(matches!(
            validate(&request("npx", &["a\0b"], &[])),
            Err(McpStdioError::Invalid { .. })
        ));
        let too_many: Vec<String> = (0..=MAX_ARGUMENTS).map(|i| i.to_string()).collect();
        let args: Vec<&str> = too_many.iter().map(String::as_str).collect();
        assert!(validate(&request("npx", &args, &[])).is_err());
    }

    #[test]
    fn approval_binds_program_arguments_and_variable_names_but_not_values() {
        let program = Path::new("/usr/local/bin/npx");
        let first = approval_for(
            program,
            &request("npx", &["-y", "s"], &[("B", "1"), ("A", "2")]),
        );
        let other_values = approval_for(
            program,
            &request("npx", &["-y", "s"], &[("A", "9"), ("B", "8")]),
        );
        let other_args = approval_for(program, &request("npx", &["-y", "t"], &[("A", "2")]));
        assert_eq!(first, other_values);
        assert_eq!(first.env_names, vec!["A".to_owned(), "B".to_owned()]);
        assert_ne!(first, other_args);
    }

    #[test]
    fn remembers_approvals_across_reads() {
        let path = std::env::temp_dir()
            .join(format!("openpencil-mcp-approvals-{}", std::process::id()))
            .join(APPROVALS_FILE);
        let approval = approval_for(Path::new("/bin/npx"), &request("npx", &["x"], &[]));
        assert!(read_approvals(&path).is_empty());
        write_approvals(&path, std::slice::from_ref(&approval)).unwrap();
        assert_eq!(read_approvals(&path), vec![approval]);
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }
}
