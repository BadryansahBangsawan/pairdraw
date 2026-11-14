//! The one change a write may make to a client's config file: the `pairdraw` server entry
//! added in its fixed form, or removed. The webview proposes the edited text, which keeps the
//! person's comments and formatting; this module checks that the old and new text read as the
//! same values apart from that entry, so nothing the webview sends can add another server or
//! change any other setting. The entries match `src/app/automation/mcp/clients/catalog.ts`.

use serde_json::{json, Value};

use super::{jsonc, McpClient};

/// The name every client knows the server by (`PAIRDRAW_MCP_SERVER`).
pub const ENTRY_NAME: &str = "pairdraw";
/// The command `npm install -g @pairdraw/mcp` puts on the PATH.
pub const ENTRY_COMMAND: &str = "pairdraw-mcp";
/// Codex's servers table in `config.toml`.
const TOML_SERVERS: &str = "mcp_servers";

/// Why a proposed text was not written.
#[derive(Debug, PartialEq, Eq)]
pub enum EntryCheck {
    /// The file as it is now cannot be read in its format.
    Invalid,
    /// The proposed text changes more than the entry, or is not valid.
    Refused,
}

/// The JSON object a client keeps its servers in, and the entry it starts this server with.
fn json_entry(client: McpClient) -> Option<(&'static str, Value)> {
    let entry = match client {
        McpClient::ClaudeCode => (
            "mcpServers",
            json!({ "type": "stdio", "command": ENTRY_COMMAND, "args": [] }),
        ),
        McpClient::ClaudeDesktop | McpClient::GeminiCli | McpClient::Cursor => {
            ("mcpServers", json!({ "command": ENTRY_COMMAND }))
        }
        McpClient::Kiro => (
            "mcpServers",
            json!({ "command": ENTRY_COMMAND, "args": [] }),
        ),
        McpClient::Opencode => (
            "mcp",
            json!({ "type": "local", "command": [ENTRY_COMMAND], "enabled": true }),
        ),
        McpClient::VsCode => (
            "servers",
            json!({ "type": "stdio", "command": ENTRY_COMMAND }),
        ),
        McpClient::Codex => return None,
    };
    Some(entry)
}

fn is_blank(text: Option<&str>) -> bool {
    text.is_none_or(|text| text.trim_start_matches('\u{feff}').trim().is_empty())
}

/// `value` without `container` when that is an empty object, which configures nothing.
fn without_empty_json(mut value: serde_json::Map<String, Value>, container: &str) -> Value {
    if value
        .get(container)
        .is_some_and(|servers| servers.as_object().is_some_and(serde_json::Map::is_empty))
    {
        value.remove(container);
    }
    Value::Object(value)
}

fn check_json(
    container: &str,
    entry: Value,
    enabled: bool,
    before: Option<&str>,
    after: &str,
) -> Result<(), EntryCheck> {
    let mut expected = if is_blank(before) {
        serde_json::Map::new()
    } else {
        match before.and_then(jsonc::parse) {
            Some(Value::Object(object)) => object,
            _ => return Err(EntryCheck::Invalid),
        }
    };
    let servers = expected
        .entry(container)
        .or_insert_with(|| Value::Object(serde_json::Map::new()))
        .as_object_mut()
        .ok_or(EntryCheck::Invalid)?;
    if enabled {
        servers.insert(ENTRY_NAME.to_owned(), entry);
    } else {
        servers.remove(ENTRY_NAME);
    }
    let Some(Value::Object(proposed)) = jsonc::parse(after) else {
        return Err(EntryCheck::Refused);
    };
    if without_empty_json(proposed, container) == without_empty_json(expected, container) {
        Ok(())
    } else {
        Err(EntryCheck::Refused)
    }
}

fn without_empty_toml(mut value: toml::Table) -> toml::Table {
    if value
        .get(TOML_SERVERS)
        .is_some_and(|servers| servers.as_table().is_some_and(toml::Table::is_empty))
    {
        value.remove(TOML_SERVERS);
    }
    value
}

fn check_toml(enabled: bool, before: Option<&str>, after: &str) -> Result<(), EntryCheck> {
    let mut expected = match before {
        Some(text) => text
            .trim_start_matches('\u{feff}')
            .parse::<toml::Table>()
            .map_err(|_| EntryCheck::Invalid)?,
        None => toml::Table::new(),
    };
    let servers = expected
        .entry(TOML_SERVERS)
        .or_insert_with(|| toml::Value::Table(toml::Table::new()))
        .as_table_mut()
        .ok_or(EntryCheck::Invalid)?;
    if enabled {
        let mut entry = toml::Table::new();
        entry.insert("command".to_owned(), ENTRY_COMMAND.into());
        servers.insert(ENTRY_NAME.to_owned(), toml::Value::Table(entry));
    } else {
        servers.remove(ENTRY_NAME);
    }
    let proposed = after
        .trim_start_matches('\u{feff}')
        .parse::<toml::Table>()
        .map_err(|_| EntryCheck::Refused)?;
    if without_empty_toml(proposed) == without_empty_toml(expected) {
        Ok(())
    } else {
        Err(EntryCheck::Refused)
    }
}

/// Whether `after` is `before` (`None`: no file yet) with only the entry added (`enabled`) or
/// removed.
pub fn check_edit(
    client: McpClient,
    enabled: bool,
    before: Option<&str>,
    after: &str,
) -> Result<(), EntryCheck> {
    match json_entry(client) {
        Some((container, entry)) => check_json(container, entry, enabled, before, after),
        None => check_toml(enabled, before, after),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CURSOR: &str = "{\n  // mine\n  \"mcpServers\": {\n    \"other\": { \"command\": \"o\" },\n  },\n  \"theme\": 1\n}\n";

    #[test]
    fn allows_adding_and_removing_only_the_entry() {
        let added = "{\n  // mine\n  \"mcpServers\": {\n    \"other\": { \"command\": \"o\" },\n    \"pairdraw\": { \"command\": \"pairdraw-mcp\" },\n  },\n  \"theme\": 1\n}\n";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), added),
            Ok(())
        );
        assert_eq!(
            check_edit(McpClient::Cursor, false, Some(added), CURSOR),
            Ok(())
        );
        let fresh = "{\n  \"servers\": {\n    \"pairdraw\": {\"type\": \"stdio\", \"command\": \"pairdraw-mcp\"}\n  }\n}\n";
        assert_eq!(check_edit(McpClient::VsCode, true, None, fresh), Ok(()));
        assert_eq!(
            check_edit(
                McpClient::VsCode,
                false,
                Some(fresh),
                "{\n  \"servers\": {}\n}\n"
            ),
            Ok(())
        );
    }

    #[test]
    fn refuses_any_other_server_or_setting() {
        let other_server = "{\"mcpServers\": {\"other\": {\"command\": \"o\"}, \"x\": {\"command\": \"sh\", \"args\": [\"-c\", \"id\"]}}, \"theme\": 1}";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), other_server),
            Err(EntryCheck::Refused)
        );
        let other_command = "{\"mcpServers\": {\"other\": {\"command\": \"o\"}, \"pairdraw\": {\"command\": \"sh\"}}, \"theme\": 1}";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), other_command),
            Err(EntryCheck::Refused)
        );
        let changed_setting = "{\"mcpServers\": {\"other\": {\"command\": \"o\"}, \"pairdraw\": {\"command\": \"pairdraw-mcp\"}}, \"theme\": 2}";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), changed_setting),
            Err(EntryCheck::Refused)
        );
        assert_eq!(
            check_edit(McpClient::Cursor, false, Some(CURSOR), "{}"),
            Err(EntryCheck::Refused)
        );
        let repeated = "{\"mcpServers\": {\"other\": {\"command\": \"o\"}}, \"mcpServers\": {\"other\": {\"command\": \"o\"}, \"pairdraw\": {\"command\": \"pairdraw-mcp\"}}, \"theme\": 1}";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), repeated),
            Err(EntryCheck::Refused)
        );
        // Another client's form of the entry is not this client's.
        let claude_form = "{\"mcpServers\": {\"other\": {\"command\": \"o\"}, \"pairdraw\": {\"type\": \"stdio\", \"command\": \"pairdraw-mcp\", \"args\": []}}, \"theme\": 1}";
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some(CURSOR), claude_form),
            Err(EntryCheck::Refused)
        );
        assert_eq!(
            check_edit(McpClient::ClaudeCode, true, Some(CURSOR), claude_form),
            Ok(())
        );
    }

    #[test]
    fn leaves_a_file_with_errors_alone() {
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some("{"), "{\"mcpServers\": {}}"),
            Err(EntryCheck::Invalid)
        );
        assert_eq!(
            check_edit(McpClient::Cursor, true, Some("{\"mcpServers\": []}"), "{}"),
            Err(EntryCheck::Invalid)
        );
    }

    #[test]
    fn checks_codex_tables() {
        let before = "# mine\nmodel = \"o3\"\n\n[mcp_servers.other]\ncommand = \"o\"\n";
        let added = format!("{before}\n[mcp_servers.pairdraw]\ncommand = \"pairdraw-mcp\"\n");
        assert_eq!(
            check_edit(McpClient::Codex, true, Some(before), &added),
            Ok(())
        );
        assert_eq!(
            check_edit(McpClient::Codex, false, Some(&added), before),
            Ok(())
        );
        assert_eq!(
            check_edit(McpClient::Codex, false, Some(&added), "model = \"o3\"\n"),
            Err(EntryCheck::Refused)
        );
        let with_args = format!(
            "{before}\n[mcp_servers.pairdraw]\ncommand = \"pairdraw-mcp\"\nargs = [\"--x\"]\n"
        );
        assert_eq!(
            check_edit(McpClient::Codex, true, Some(before), &with_args),
            Err(EntryCheck::Refused)
        );
        let other = format!("{before}\n[mcp_servers.x]\ncommand = \"sh\"\n[mcp_servers.pairdraw]\ncommand = \"pairdraw-mcp\"\n");
        assert_eq!(
            check_edit(McpClient::Codex, true, Some(before), &other),
            Err(EntryCheck::Refused)
        );
        let fresh = "[mcp_servers.pairdraw]\ncommand = \"pairdraw-mcp\"\n";
        assert_eq!(check_edit(McpClient::Codex, true, None, fresh), Ok(()));
        assert_eq!(check_edit(McpClient::Codex, false, Some(fresh), ""), Ok(()));
        assert_eq!(
            check_edit(McpClient::Codex, true, Some("a = "), fresh),
            Err(EntryCheck::Invalid)
        );
    }
}
