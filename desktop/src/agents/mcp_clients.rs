//! The MCP configuration files of agents people run outside Pairdraw, which Settings → MCP
//! adds the `pairdraw` server to or removes it from. The webview names a client, never a path:
//! each client's file is resolved here, so these commands reach only those files, which the fs
//! scope keeps out of the webview's reach as places where a written file would run.
//!
//! The webview edits the text itself, keeping the person's other entries and formatting. A write
//! applies only while the file still holds the text that edit started from, and only when the
//! edit adds this server's fixed entry or removes it and changes nothing else (`entry`), so the
//! webview cannot make a client start any other program. It keeps a copy of the file as it was
//! before Pairdraw first changed it, and replaces the file in one rename.

mod entry;
mod jsonc;

use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf, MAIN_SEPARATOR};

use entry::{check_edit, EntryCheck};

/// Claude Code keeps its whole state in `.claude.json`, which grows with every project.
const MAX_CONFIG_BYTES: u64 = 16 * 1024 * 1024;
/// Appended to the file's name for the copy made before the first change.
const BACKUP_SUFFIX: &str = ".pairdraw.bak";

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum McpClient {
    ClaudeCode,
    ClaudeDesktop,
    Codex,
    GeminiCli,
    Opencode,
    Kiro,
    Cursor,
    VsCode,
    Omp,
}

/// The folders the clients' files are resolved against.
#[derive(Debug, Clone)]
pub struct Locations {
    home: PathBuf,
    /// Where desktop apps keep their settings: `~/Library/Application Support` on macOS,
    /// `%APPDATA%` on Windows, the XDG config folder on Linux.
    app_config: PathBuf,
    /// The XDG config folder, which OpenCode uses on every platform.
    xdg_config: PathBuf,
    /// `CODEX_HOME`, when set.
    codex_home: Option<PathBuf>,
    /// `CLAUDE_CONFIG_DIR`, when set.
    claude_config_dir: Option<PathBuf>,
    /// `PI_CODING_AGENT_DIR`, omp's agent folder, when set.
    omp_agent_dir: Option<PathBuf>,
}

fn env_dir(name: &str) -> Option<PathBuf> {
    std::env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .filter(|path| path.is_absolute())
}

impl Locations {
    fn from_env() -> Option<Self> {
        let home = std::env::home_dir()?;
        let xdg_config = env_dir("XDG_CONFIG_HOME").unwrap_or_else(|| home.join(".config"));
        let app_config = if cfg!(target_os = "macos") {
            home.join("Library").join("Application Support")
        } else if cfg!(windows) {
            env_dir("APPDATA").unwrap_or_else(|| home.join("AppData").join("Roaming"))
        } else {
            xdg_config.clone()
        };
        Some(Self {
            home,
            app_config,
            xdg_config,
            codex_home: env_dir("CODEX_HOME"),
            claude_config_dir: env_dir("CLAUDE_CONFIG_DIR"),
            omp_agent_dir: env_dir("PI_CODING_AGENT_DIR"),
        })
    }
}

/// A client's configuration file, and the folder whose presence means the client is set up here.
#[derive(Debug, PartialEq)]
struct ClientFile {
    path: PathBuf,
    marker: PathBuf,
}

fn client_file(client: McpClient, at: &Locations) -> ClientFile {
    match client {
        McpClient::ClaudeCode => match &at.claude_config_dir {
            Some(dir) => ClientFile {
                path: dir.join(".claude.json"),
                marker: dir.clone(),
            },
            None => ClientFile {
                path: at.home.join(".claude.json"),
                marker: at.home.join(".claude"),
            },
        },
        McpClient::ClaudeDesktop => {
            let dir = at.app_config.join("Claude");
            ClientFile {
                path: dir.join("claude_desktop_config.json"),
                marker: dir,
            }
        }
        McpClient::Codex => {
            let dir = at
                .codex_home
                .clone()
                .unwrap_or_else(|| at.home.join(".codex"));
            ClientFile {
                path: dir.join("config.toml"),
                marker: dir,
            }
        }
        McpClient::GeminiCli => {
            let dir = at.home.join(".gemini");
            ClientFile {
                path: dir.join("settings.json"),
                marker: dir,
            }
        }
        McpClient::Opencode => {
            let dir = at.xdg_config.join("opencode");
            let json = dir.join("opencode.json");
            let jsonc = dir.join("opencode.jsonc");
            let path = if !json.exists() && jsonc.exists() {
                jsonc
            } else {
                json
            };
            ClientFile { path, marker: dir }
        }
        McpClient::Kiro => {
            let dir = at.home.join(".kiro");
            ClientFile {
                path: dir.join("settings").join("mcp.json"),
                marker: dir,
            }
        }
        McpClient::Cursor => {
            let dir = at.home.join(".cursor");
            ClientFile {
                path: dir.join("mcp.json"),
                marker: dir,
            }
        }
        McpClient::VsCode => {
            let dir = at.app_config.join("Code").join("User");
            ClientFile {
                path: dir.join("mcp.json"),
                marker: dir,
            }
        }
        McpClient::Omp => match &at.omp_agent_dir {
            Some(dir) => ClientFile {
                path: dir.join("mcp.json"),
                marker: dir.clone(),
            },
            None => {
                let dir = at.home.join(".omp");
                ClientFile {
                    path: dir.join("agent").join("mcp.json"),
                    marker: dir,
                }
            }
        },
    }
}

impl ClientFile {
    fn installed(&self) -> bool {
        self.marker.is_dir() || self.path.is_file()
    }
}

/// `path` with the home folder written as `~`, as Settings shows it; a resolved path may start
/// with the home folder's own resolved form.
fn display_path(path: &Path, home: &Path) -> String {
    let resolved_home = fs::canonicalize(home).ok();
    let rest = path
        .strip_prefix(home)
        .ok()
        .or_else(|| path.strip_prefix(resolved_home.as_deref()?).ok());
    match rest {
        Some(rest) => format!("~{MAIN_SEPARATOR}{}", rest.display()),
        None => path.display().to_string(),
    }
}

/// The file's text, `None` when it does not exist; refused past the size limit or when not text.
fn read_text(path: &Path) -> Result<Option<String>, &'static str> {
    let metadata = match fs::metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("unreadable"),
    };
    if !metadata.is_file() {
        return Err("unreadable");
    }
    if metadata.len() > MAX_CONFIG_BYTES {
        return Err("too-large");
    }
    let mut bytes = Vec::new();
    fs::File::open(path)
        .and_then(|file| file.take(MAX_CONFIG_BYTES + 1).read_to_end(&mut bytes))
        .map_err(|_| "unreadable")?;
    if bytes.len() as u64 > MAX_CONFIG_BYTES {
        return Err("too-large");
    }
    String::from_utf8(bytes).map(Some).map_err(|_| "unreadable")
}

#[derive(Debug, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct McpClientConfig {
    display_path: String,
    /// The client's folder exists, or its file does.
    installed: bool,
    /// The file's text; absent when there is no file yet.
    content: Option<String>,
}

pub fn read_client_config(client: McpClient, at: &Locations) -> Result<McpClientConfig, String> {
    let file = client_file(client, at);
    let content = read_text(&file.path).map_err(str::to_owned)?;
    Ok(McpClientConfig {
        display_path: display_path(&file.path, &at.home),
        installed: file.installed(),
        content,
    })
}

#[derive(Debug, serde::Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct McpClientWrite {
    /// The copy made before this first change, if this write made one.
    backup: Option<String>,
}

fn sibling(target: &Path, suffix: &str) -> Option<PathBuf> {
    let name = target.file_name()?.to_str()?;
    Some(target.with_file_name(format!("{name}{suffix}")))
}

/// A new file only its owner can read, since these files can hold keys; the caller gives it the
/// permissions of the file it replaces before writing anything into it.
fn create_private(path: &Path) -> std::io::Result<fs::File> {
    let _ = fs::remove_file(path);
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(path)
}

/// Replaces `target` with `content` in one rename, keeping the permissions the file had; a new
/// file is readable by its owner only.
fn replace_file(target: &Path, content: &str) -> std::io::Result<()> {
    let temporary = sibling(target, &format!(".pairdraw-{}.tmp", std::process::id()))
        .ok_or_else(|| std::io::Error::other("the file has no name"))?;
    let permissions = fs::metadata(target)
        .ok()
        .map(|metadata| metadata.permissions());
    let written = (|| {
        let mut file = create_private(&temporary)?;
        // On Windows a read-only attribute set now would stop the write; it is set afterwards.
        if cfg!(unix) {
            if let Some(permissions) = &permissions {
                fs::set_permissions(&temporary, permissions.clone())?;
            }
        }
        file.write_all(content.as_bytes())?;
        file.sync_all()?;
        if !cfg!(unix) {
            if let Some(permissions) = permissions {
                fs::set_permissions(&temporary, permissions)?;
            }
        }
        fs::rename(&temporary, target)
    })();
    if written.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    written
}

/// Writes `content` when the file still holds `expected` (`None`: there is no file yet) and
/// `content` is that text with only the entry added (`enabled`) or removed.
pub fn write_client_config(
    client: McpClient,
    at: &Locations,
    enabled: bool,
    content: &str,
    expected: Option<&str>,
) -> Result<McpClientWrite, String> {
    let file = client_file(client, at);
    if !file.installed() {
        return Err("not-installed".to_owned());
    }
    if content.len() as u64 > MAX_CONFIG_BYTES {
        return Err("too-large".to_owned());
    }
    let current = read_text(&file.path).map_err(str::to_owned)?;
    if current.as_deref() != expected {
        return Err("changed".to_owned());
    }
    check_edit(client, enabled, current.as_deref(), content).map_err(|check| {
        match check {
            EntryCheck::Invalid => "invalid",
            EntryCheck::Refused => "refused",
        }
        .to_owned()
    })?;
    // A file that links elsewhere, as dotfile managers set up, is written where it leads.
    let target = match current {
        Some(_) => fs::canonicalize(&file.path).map_err(|_| "write-failed".to_owned())?,
        None => {
            let parent = file.path.parent().ok_or("write-failed")?;
            fs::create_dir_all(parent).map_err(|_| "write-failed".to_owned())?;
            file.path.clone()
        }
    };
    let mut backup = None;
    if current.is_some() {
        let copy = sibling(&target, BACKUP_SUFFIX).ok_or("write-failed")?;
        if !copy.exists() {
            fs::copy(&target, &copy).map_err(|_| "write-failed".to_owned())?;
            backup = Some(display_path(&copy, &at.home));
        }
    }
    replace_file(&target, content).map_err(|_| "write-failed".to_owned())?;
    Ok(McpClientWrite { backup })
}

fn locations() -> Result<Locations, String> {
    Locations::from_env().ok_or_else(|| "unreadable".to_owned())
}

#[tauri::command]
pub async fn mcp_client_config_read(client: McpClient) -> Result<McpClientConfig, String> {
    tauri::async_runtime::spawn_blocking(move || read_client_config(client, &locations()?))
        .await
        .map_err(|_| "unreadable".to_owned())?
}

#[tauri::command]
pub async fn mcp_client_config_write(
    client: McpClient,
    enabled: bool,
    content: String,
    expected: Option<String>,
) -> Result<McpClientWrite, String> {
    tauri::async_runtime::spawn_blocking(move || {
        write_client_config(
            client,
            &locations()?,
            enabled,
            &content,
            expected.as_deref(),
        )
    })
    .await
    .map_err(|_| "write-failed".to_owned())?
}

#[cfg(test)]
mod tests;
