//! Which cloud Claude Code is set up to use instead of an Anthropic sign-in: Amazon Bedrock,
//! Google Vertex AI, or Microsoft Foundry, chosen by `CLAUDE_CODE_USE_*` switches.
//!
//! Claude Code reads the switches from its environment and from the `env` block of its user and
//! managed settings. The agent starts with this process's environment, so those are the places
//! read here. Only the three switches are read: other variables, which may hold keys, never are.

use std::path::{Path, PathBuf};

/// The switches in the order Claude Code checks them, with the name the app shows.
const SWITCHES: &[(&str, &str)] = &[
    ("CLAUDE_CODE_USE_BEDROCK", "bedrock"),
    ("CLAUDE_CODE_USE_VERTEX", "vertex"),
    ("CLAUDE_CODE_USE_FOUNDRY", "foundry"),
];

/// Claude Code turns a switch on for `1`, `true`, `yes`, or `on`, in any case.
fn is_on(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "1" | "true" | "yes" | "on"
    )
}

/// Reads one variable from a place Claude Code takes its switches from.
pub type SwitchSource<'a> = &'a dyn Fn(&str) -> Option<String>;

/// The cloud the first switch that is on names. Settings override the environment, and managed
/// settings override the user's, so `sources` lists the most specific source first.
pub fn cloud_from(sources: &[SwitchSource]) -> Option<&'static str> {
    SWITCHES.iter().find_map(|(name, cloud)| {
        let value = sources.iter().find_map(|source| source(name))?;
        is_on(&value).then_some(*cloud)
    })
}

/// The switches a settings file sets in its `env` block, as text; nothing for a missing or
/// unreadable file. A switch set to anything other than text, a boolean, or a number reads as
/// empty, so it still overrides the environment and stays off, as in the companion's
/// `packages/mcp/src/agents/claude-cloud.ts`.
fn settings_switches(path: &Path) -> Vec<(String, String)> {
    let Ok(text) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    let Ok(serde_json::Value::Object(settings)) = serde_json::from_str::<serde_json::Value>(&text)
    else {
        return Vec::new();
    };
    let Some(serde_json::Value::Object(env)) = settings.get("env") else {
        return Vec::new();
    };
    SWITCHES
        .iter()
        .filter_map(|(name, _)| {
            let value = match env.get(*name)? {
                serde_json::Value::String(text) => text.clone(),
                serde_json::Value::Bool(flag) => flag.to_string(),
                serde_json::Value::Number(number) => number.to_string(),
                _ => String::new(),
            };
            Some(((*name).to_owned(), value))
        })
        .collect()
}

/// The managed settings file administrators deploy for every user of the computer.
fn managed_settings() -> Option<PathBuf> {
    if cfg!(target_os = "macos") {
        Some(PathBuf::from(
            "/Library/Application Support/ClaudeCode/managed-settings.json",
        ))
    } else if cfg!(windows) {
        Some(PathBuf::from(
            r"C:\Program Files\ClaudeCode\managed-settings.json",
        ))
    } else if cfg!(target_os = "linux") {
        Some(PathBuf::from("/etc/claude-code/managed-settings.json"))
    } else {
        None
    }
}

/// The user's settings, in `CLAUDE_CONFIG_DIR` when that names another folder.
fn user_settings() -> Option<PathBuf> {
    let dir = match std::env::var_os("CLAUDE_CONFIG_DIR") {
        Some(dir) if !dir.is_empty() => PathBuf::from(dir),
        _ => std::env::home_dir()?.join(".claude"),
    };
    Some(dir.join("settings.json"))
}

fn lookup(switches: &[(String, String)], name: &str) -> Option<String> {
    switches
        .iter()
        .find(|(key, _)| key == name)
        .map(|(_, value)| value.clone())
}

/// The cloud Claude Code on this computer is set up to use, if any.
pub fn claude_code_cloud() -> Option<&'static str> {
    let managed = managed_settings()
        .map(|path| settings_switches(&path))
        .unwrap_or_default();
    let user = user_settings()
        .map(|path| settings_switches(&path))
        .unwrap_or_default();
    let from_managed = |name: &str| lookup(&managed, name);
    let from_user = |name: &str| lookup(&user, name);
    let from_env = |name: &str| std::env::var(name).ok();
    cloud_from(&[&from_managed, &from_user, &from_env])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn source(pairs: &'static [(&'static str, &'static str)]) -> impl Fn(&str) -> Option<String> {
        move |name| {
            pairs
                .iter()
                .find(|(key, _)| *key == name)
                .map(|(_, value)| (*value).to_owned())
        }
    }

    #[test]
    fn reads_the_first_switch_that_is_on() {
        let env = source(&[("CLAUDE_CODE_USE_VERTEX", "1")]);
        assert_eq!(cloud_from(&[&env]), Some("vertex"));
        let both = source(&[
            ("CLAUDE_CODE_USE_FOUNDRY", "true"),
            ("CLAUDE_CODE_USE_BEDROCK", "YES"),
        ]);
        assert_eq!(cloud_from(&[&both]), Some("bedrock"));
    }

    #[test]
    fn ignores_switches_that_are_off_or_missing() {
        let off = source(&[
            ("CLAUDE_CODE_USE_BEDROCK", "0"),
            ("CLAUDE_CODE_USE_VERTEX", ""),
        ]);
        assert_eq!(cloud_from(&[&off]), None);
        let none = source(&[("ANTHROPIC_API_KEY", "secret")]);
        assert_eq!(cloud_from(&[&none]), None);
    }

    #[test]
    fn lets_settings_override_the_environment() {
        let settings = source(&[("CLAUDE_CODE_USE_BEDROCK", "0")]);
        let env = source(&[("CLAUDE_CODE_USE_BEDROCK", "1")]);
        assert_eq!(cloud_from(&[&settings, &env]), None);
        let vertex = source(&[("CLAUDE_CODE_USE_VERTEX", "on")]);
        assert_eq!(cloud_from(&[&vertex, &env]), Some("bedrock"));
    }

    #[test]
    fn reads_only_the_switches_from_a_settings_file() {
        let dir = std::env::temp_dir().join(format!("pairdraw-claude-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("create folder");
        let path = dir.join("settings.json");
        std::fs::write(
            &path,
            r#"{"env":{"CLAUDE_CODE_USE_FOUNDRY":"1","CLAUDE_CODE_USE_VERTEX":true,"ANTHROPIC_API_KEY":"secret"}}"#,
        )
        .expect("write settings");
        let switches = settings_switches(&path);
        assert_eq!(
            switches,
            vec![
                ("CLAUDE_CODE_USE_VERTEX".to_owned(), "true".to_owned()),
                ("CLAUDE_CODE_USE_FOUNDRY".to_owned(), "1".to_owned()),
            ]
        );
        // A switch set to null, an array, or an object is present but off, and so masks the
        // environment, as the companion reads it.
        std::fs::write(
            &path,
            r#"{"env":{"CLAUDE_CODE_USE_BEDROCK":null,"CLAUDE_CODE_USE_VERTEX":[],"CLAUDE_CODE_USE_FOUNDRY":{}}}"#,
        )
        .expect("write settings");
        let masked = settings_switches(&path);
        assert_eq!(
            masked,
            vec![
                ("CLAUDE_CODE_USE_BEDROCK".to_owned(), String::new()),
                ("CLAUDE_CODE_USE_VERTEX".to_owned(), String::new()),
                ("CLAUDE_CODE_USE_FOUNDRY".to_owned(), String::new()),
            ]
        );
        let from_settings = |name: &str| lookup(&masked, name);
        let env = source(&[("CLAUDE_CODE_USE_BEDROCK", "1")]);
        assert_eq!(cloud_from(&[&from_settings, &env]), None);
        std::fs::write(&path, "not json").expect("write settings");
        assert!(settings_switches(&path).is_empty());
        assert!(settings_switches(&dir.join("missing.json")).is_empty());
        std::fs::remove_dir_all(&dir).expect("clean up");
    }
}
