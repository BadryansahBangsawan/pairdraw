use super::*;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

struct Scratch(PathBuf);

impl Scratch {
    fn new() -> Self {
        let id = NEXT.fetch_add(1, Ordering::Relaxed);
        let base = std::env::temp_dir().join(format!(
            "pairdraw-mcp-clients-{}-{id}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();
        Self(base)
    }

    fn at(&self) -> Locations {
        Locations {
            home: self.0.clone(),
            app_config: self.0.join("app-config"),
            xdg_config: self.0.join(".config"),
            codex_home: None,
            claude_config_dir: None,
        }
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn resolves_each_client_inside_its_own_folder() {
    let scratch = Scratch::new();
    let at = scratch.at();
    let home = &scratch.0;
    assert_eq!(
        client_file(McpClient::ClaudeCode, &at).path,
        home.join(".claude.json")
    );
    assert_eq!(
        client_file(McpClient::Codex, &at).path,
        home.join(".codex/config.toml")
    );
    assert_eq!(
        client_file(McpClient::Kiro, &at).path,
        home.join(".kiro/settings/mcp.json")
    );
    assert_eq!(
        client_file(McpClient::VsCode, &at).path,
        home.join("app-config/Code/User/mcp.json")
    );
    let custom = Locations {
        codex_home: Some(home.join("codex-elsewhere")),
        claude_config_dir: Some(home.join("claude-elsewhere")),
        ..at
    };
    assert_eq!(
        client_file(McpClient::Codex, &custom).path,
        home.join("codex-elsewhere/config.toml")
    );
    assert_eq!(
        client_file(McpClient::ClaudeCode, &custom).path,
        home.join("claude-elsewhere/.claude.json")
    );
}

#[test]
fn opencode_keeps_a_jsonc_file_it_already_has() {
    let scratch = Scratch::new();
    let at = scratch.at();
    let dir = scratch.0.join(".config/opencode");
    fs::create_dir_all(&dir).unwrap();
    assert_eq!(
        client_file(McpClient::Opencode, &at).path,
        dir.join("opencode.json")
    );
    fs::write(dir.join("opencode.jsonc"), "{}").unwrap();
    assert_eq!(
        client_file(McpClient::Opencode, &at).path,
        dir.join("opencode.jsonc")
    );
}

#[test]
fn reads_a_missing_file_as_none_and_reports_whether_the_client_is_set_up() {
    let scratch = Scratch::new();
    let at = scratch.at();
    let config = read_client_config(McpClient::Cursor, &at).unwrap();
    assert!(!config.installed);
    assert_eq!(config.content, None);
    assert_eq!(
        config.display_path,
        format!(
            "~{MAIN_SEPARATOR}{}",
            Path::new(".cursor/mcp.json").display()
        )
    );
    fs::create_dir_all(scratch.0.join(".cursor")).unwrap();
    assert!(
        read_client_config(McpClient::Cursor, &at)
            .unwrap()
            .installed
    );
}

const KIRO_ADDED: &str =
    "{\"mcpServers\":{\"pairdraw\":{\"command\":\"pairdraw-mcp\",\"args\":[]}}}\n";
const ONE_SERVER: &str = "{\"mcpServers\":{\"pairdraw\":{\"command\":\"pairdraw-mcp\"}}}";
const NO_SERVER: &str = "{\"mcpServers\":{}}";
const CODEX_ADDED: &str = "a = 1\n\n[mcp_servers.pairdraw]\ncommand = \"pairdraw-mcp\"\n";

#[test]
fn refuses_a_client_that_is_not_set_up() {
    let scratch = Scratch::new();
    assert_eq!(
        write_client_config(McpClient::Kiro, &scratch.at(), true, KIRO_ADDED, None),
        Err("not-installed".to_owned())
    );
    assert!(!scratch.0.join(".kiro").exists());
}

#[cfg(unix)]
#[test]
fn creates_the_file_and_its_folder_when_missing_readable_by_its_owner_only() {
    use std::os::unix::fs::PermissionsExt;

    let scratch = Scratch::new();
    fs::create_dir_all(scratch.0.join(".kiro")).unwrap();
    let written = write_client_config(McpClient::Kiro, &scratch.at(), true, KIRO_ADDED, None);
    assert_eq!(written, Ok(McpClientWrite { backup: None }));
    let path = scratch.0.join(".kiro/settings/mcp.json");
    assert_eq!(fs::read_to_string(&path).unwrap(), KIRO_ADDED);
    assert_eq!(
        fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o600
    );
}

#[test]
fn writes_only_over_the_text_the_edit_started_from() {
    let scratch = Scratch::new();
    let path = scratch.0.join(".cursor/mcp.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, NO_SERVER).unwrap();
    let at = scratch.at();
    assert_eq!(
        write_client_config(McpClient::Cursor, &at, true, ONE_SERVER, Some("{}")),
        Err("changed".to_owned())
    );
    assert_eq!(
        write_client_config(McpClient::Cursor, &at, true, ONE_SERVER, None),
        Err("changed".to_owned())
    );
    assert_eq!(fs::read_to_string(&path).unwrap(), NO_SERVER);
}

#[test]
fn refuses_text_that_changes_more_than_the_entry() {
    let scratch = Scratch::new();
    let path = scratch.0.join(".cursor/mcp.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mine = "{\"mcpServers\":{\"mine\":{\"command\":\"m\"}},\"keep\":true}";
    fs::write(&path, mine).unwrap();
    let at = scratch.at();
    let elsewhere = "{\"mcpServers\":{\"mine\":{\"command\":\"m\"},\"x\":{\"command\":\"sh\",\"args\":[\"-c\",\"id\"]}},\"keep\":true}";
    for content in [elsewhere, "{}", "", ONE_SERVER] {
        assert_eq!(
            write_client_config(McpClient::Cursor, &at, true, content, Some(mine)),
            Err("refused".to_owned())
        );
    }
    // Removing may not take anything else with it either.
    assert_eq!(
        write_client_config(McpClient::Cursor, &at, false, "{}", Some(mine)),
        Err("refused".to_owned())
    );
    assert_eq!(fs::read_to_string(&path).unwrap(), mine);
    assert!(!scratch.0.join(".cursor/mcp.json.pairdraw.bak").exists());

    fs::write(&path, "{ not json").unwrap();
    assert_eq!(
        write_client_config(McpClient::Cursor, &at, true, ONE_SERVER, Some("{ not json")),
        Err("invalid".to_owned())
    );
}

#[test]
fn keeps_the_original_file_once_before_the_first_change() {
    let scratch = Scratch::new();
    let path = scratch.0.join(".gemini/settings.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, NO_SERVER).unwrap();
    let at = scratch.at();

    let first = write_client_config(McpClient::GeminiCli, &at, true, ONE_SERVER, Some(NO_SERVER));
    let backup = scratch.0.join(".gemini/settings.json.pairdraw.bak");
    assert_eq!(
        first,
        Ok(McpClientWrite {
            backup: Some(display_path(&backup, &scratch.0))
        })
    );
    let again = write_client_config(
        McpClient::GeminiCli,
        &at,
        false,
        NO_SERVER,
        Some(ONE_SERVER),
    );
    assert_eq!(again, Ok(McpClientWrite { backup: None }));
    assert_eq!(fs::read_to_string(&path).unwrap(), NO_SERVER);
    assert_eq!(fs::read_to_string(&backup).unwrap(), NO_SERVER);
}

#[cfg(unix)]
#[test]
fn writes_through_a_linked_file_and_keeps_its_permissions() {
    use std::os::unix::fs::PermissionsExt;

    let scratch = Scratch::new();
    let dotfiles = scratch.0.join("dotfiles");
    fs::create_dir_all(&dotfiles).unwrap();
    fs::create_dir_all(scratch.0.join(".codex")).unwrap();
    let real = dotfiles.join("config.toml");
    fs::write(&real, "a = 1\n").unwrap();
    fs::set_permissions(&real, fs::Permissions::from_mode(0o640)).unwrap();
    let link = scratch.0.join(".codex/config.toml");
    std::os::unix::fs::symlink(&real, &link).unwrap();

    write_client_config(
        McpClient::Codex,
        &scratch.at(),
        true,
        CODEX_ADDED,
        Some("a = 1\n"),
    )
    .unwrap();
    assert!(fs::symlink_metadata(&link)
        .unwrap()
        .file_type()
        .is_symlink());
    assert_eq!(fs::read_to_string(&real).unwrap(), CODEX_ADDED);
    assert_eq!(
        fs::metadata(&real).unwrap().permissions().mode() & 0o777,
        0o640
    );
}

#[test]
fn a_folder_in_place_of_the_file_is_unreadable() {
    let scratch = Scratch::new();
    fs::create_dir_all(scratch.0.join(".cursor/mcp.json")).unwrap();
    assert_eq!(
        read_client_config(McpClient::Cursor, &scratch.at()),
        Err("unreadable".to_owned())
    );
}
