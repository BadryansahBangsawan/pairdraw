//! The approval dialog for a local MCP server's command line. The shell words the question
//! and its buttons in the app's language; the webview only picks the language and names the
//! connection, so it cannot reword what the person approves.

use super::{Approval, McpStdioRequest};

/// An argument as a shell would need it, so the dialog shows where each one ends.
fn quoted(arg: &str) -> String {
    let plain = !arg.is_empty()
        && arg
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_./:=@%+,".contains(c));
    if plain {
        arg.to_owned()
    } else {
        format!("'{}'", arg.replace('\'', "'\\''"))
    }
}

/// The dialog's words, which the shell owns so the webview cannot reword the question or swap
/// its buttons; `{app}` and `{name}` are filled in.
struct PromptText {
    title: &'static str,
    message: &'static str,
    run: &'static str,
    cancel: &'static str,
}

/// One per app locale (`packages/vue/src/i18n/locale.ts`); any other code reads English.
const PROMPTS: &[(&str, PromptText)] = &[
    (
        "de",
        PromptText {
            title: "Lokalen MCP-Server ausführen?",
            message: "{app} führt diesen Befehl für die MCP-Verbindung „{name}“ aus. Erlaube nur Befehle, denen du vertraust.",
            run: "Ausführen",
            cancel: "Nicht ausführen",
        },
    ),
    (
        "es",
        PromptText {
            title: "¿Ejecutar un servidor MCP local?",
            message: "{app} ejecutará este comando para la conexión MCP «{name}». Permite solo comandos de confianza.",
            run: "Ejecutar",
            cancel: "No ejecutar",
        },
    ),
    (
        "fr",
        PromptText {
            title: "Exécuter un serveur MCP local ?",
            message: "{app} va exécuter cette commande pour la connexion MCP « {name} ». N’autorisez que des commandes de confiance.",
            run: "Exécuter",
            cancel: "Ne pas exécuter",
        },
    ),
    (
        "it",
        PromptText {
            title: "Eseguire un server MCP locale?",
            message: "{app} eseguirà questo comando per la connessione MCP «{name}». Consenti solo comandi di cui ti fidi.",
            run: "Esegui",
            cancel: "Non eseguire",
        },
    ),
    (
        "ja",
        PromptText {
            title: "ローカル MCP サーバーを実行しますか？",
            message: "{app} は MCP 接続「{name}」のためにこのコマンドを実行します。信頼できるコマンドだけを許可してください。",
            run: "実行",
            cancel: "実行しない",
        },
    ),
    (
        "pl",
        PromptText {
            title: "Uruchomić lokalny serwer MCP?",
            message: "{app} uruchomi to polecenie dla połączenia MCP „{name}”. Zezwalaj tylko na zaufane polecenia.",
            run: "Uruchom",
            cancel: "Nie uruchamiaj",
        },
    ),
    (
        "ru",
        PromptText {
            title: "Запустить локальный MCP-сервер?",
            message: "{app} запустит эту команду для MCP-подключения «{name}». Разрешайте только команды, которым доверяете.",
            run: "Запустить",
            cancel: "Не запускать",
        },
    ),
    (
        "zh-cn",
        PromptText {
            title: "运行本地 MCP 服务器？",
            message: "{app} 将为 MCP 连接“{name}”运行此命令。请只允许你信任的命令。",
            run: "运行",
            cancel: "不运行",
        },
    ),
];

const PROMPT_EN: PromptText = PromptText {
    title: "Run a local MCP server?",
    message: "{app} will run this command for the MCP connection “{name}”. Allow only commands you trust.",
    run: "Run",
    cancel: "Don’t run",
};

fn prompt_text(locale: &str) -> &'static PromptText {
    let locale = locale.to_ascii_lowercase();
    PROMPTS
        .iter()
        .find(|(code, _)| *code == locale)
        .map_or(&PROMPT_EN, |(_, text)| text)
}

const MAX_SHOWN_NAME: usize = 60;

/// The connection's name as the dialog quotes it: one short line, without control or
/// direction-changing characters, so it cannot push the command line out of view.
fn shown_name(name: &str) -> String {
    let hidden = |c: char| {
        c.is_control()
            || matches!(c, '\u{200b}'..='\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2028}' | '\u{2029}' | '\u{2066}'..='\u{2069}' | '\u{feff}')
    };
    let words: Vec<&str> = name
        .split(|c: char| c.is_whitespace() || hidden(c))
        .filter(|word| !word.is_empty())
        .collect();
    let joined = words.join(" ");
    let mut shown: String = joined.chars().take(MAX_SHOWN_NAME).collect();
    if joined.chars().count() > MAX_SHOWN_NAME {
        shown.push('…');
    }
    if shown.is_empty() {
        "MCP".to_owned()
    } else {
        shown
    }
}

/// The title, text, and buttons of the approval dialog, all but the name chosen by the shell.
pub(super) struct Dialog {
    pub(super) title: &'static str,
    pub(super) text: String,
    pub(super) run: &'static str,
    pub(super) cancel: &'static str,
}

pub(super) fn dialog(app_name: &str, request: &McpStdioRequest, approval: &Approval) -> Dialog {
    let prompt = prompt_text(&request.locale);
    let mut line = quoted(&approval.program);
    for arg in &approval.args {
        line.push(' ');
        line.push_str(&quoted(arg));
    }
    let message = prompt
        .message
        .replace("{app}", app_name)
        .replace("{name}", &shown_name(&request.name));
    let mut text = format!("{message}\n\n{line}");
    if !approval.env_names.is_empty() {
        text.push_str("\n\n");
        text.push_str(&approval.env_names.join(", "));
    }
    Dialog {
        title: prompt.title,
        text,
        run: prompt.run,
        cancel: prompt.cancel,
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::super::approval_for;
    use super::super::tests::request;
    use super::*;

    #[test]
    fn shows_each_argument_where_it_ends() {
        let req = request("npx", &["-y", "my server", "it's"], &[("TOKEN", "secret")]);
        let approval = approval_for(Path::new("/bin/npx"), &req);
        let text = dialog("Pairdraw", &req, &approval).text;
        assert!(text.contains("/bin/npx -y 'my server' 'it'\\''s'"));
        assert!(text.contains("TOKEN"));
        assert!(!text.contains("secret"));
    }

    #[test]
    fn the_shell_words_the_question_and_its_buttons() {
        let mut req = request("npx", &["x"], &[]);
        req.name = "Software update\n\n\n\n\n\u{202e}gnihton".into();
        req.locale = "de".into();
        let approval = approval_for(Path::new("/bin/npx"), &req);
        let shown = dialog("Pairdraw", &req, &approval);
        assert_eq!(shown.title, "Lokalen MCP-Server ausführen?");
        assert_eq!((shown.run, shown.cancel), ("Ausführen", "Nicht ausführen"));
        assert!(shown.text.starts_with(
            "Pairdraw führt diesen Befehl für die MCP-Verbindung „Software update gnihton“ aus."
        ));
        assert!(shown.text.ends_with("\n\n/bin/npx x"));

        req.locale = "xx-evil".into();
        let english = dialog("Pairdraw", &req, &approval);
        assert_eq!((english.run, english.cancel), ("Run", "Don’t run"));
        req.locale = "zh-CN".into();
        assert_eq!(dialog("Pairdraw", &req, &approval).run, "运行");
    }

    #[test]
    fn shortens_long_names() {
        let long = "a".repeat(200);
        let shown = shown_name(&long);
        assert_eq!(shown.chars().count(), MAX_SHOWN_NAME + 1);
        assert!(shown.ends_with('…'));
        assert_eq!(shown_name("\u{7}\u{200b}"), "MCP");
    }
}
