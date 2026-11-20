---
title: AI-Chat
description: Integrierter AI-Assistent mit 142 Werkzeugen zum Erstellen und Bearbeiten von Designs.
---

# AI-Chat

<kbd>⌘</kbd><kbd>J</kbd> beziehungsweise <kbd>Strg</kbd><kbd>J</kbd> oder die Schaltfläche mit den Funkeln bei den Aktionen des Dokuments in der oberen Leiste öffnet den Assistenten in einer eigenen Spalte neben dem Design-Panel. Beschreiben Sie, was Sie möchten: Der Assistent erstellt Formen, ändert Stile, konfiguriert die Anordnung, bearbeitet Komponenten und analysiert das Dokument.

## Mit einem Prompt beginnen

Die Startseite fragt über dem Suchfeld **Was möchtest du gestalten?**. Beschreiben Sie einen Bildschirm, eine Komponente oder eine Seite und drücken Sie <kbd>Enter</kbd> (<kbd>Shift</kbd> + <kbd>Enter</kbd> beginnt eine neue Zeile): Pairdraw öffnet ein neues Design dort, wo die Startseite eines anlegt, also im Cloud-Workspace oder Speicher-Bucket, wenn einer ausgewählt ist, öffnet dessen Chat und sendet den Prompt. Ist noch kein Modell eingerichtet, wartet der Prompt im Chat des neuen Designs, während Pairdraw einen Coding-Agenten auf Ihrem Computer sucht (siehe [Einrichtung](#einrichtung)), und wird gesendet, sobald einer verbunden ist. Wird keiner gefunden, öffnet sich zuerst die geführte Einrichtung, und der Prompt wird nach ihrem Abschluss gesendet; wird die Einrichtung geschlossen, bleibt der Prompt auf der Startseite.

Eine leere Seite eines Designs bietet auf dem Desktop denselben Prompt über der Arbeitsfläche an. Er sendet in den Chat dieses Dokuments und verschwindet, sobald die Seite eine Ebene hat oder ein Agent zu arbeiten beginnt; die Arbeitsfläche ringsum funktioniert wie gewohnt. Schließen Sie ihn, um ihn für dieses Dokument auszublenden, oder schalten Sie **Prompt auf der Arbeitsfläche** unter **Einstellungen → Modelle → Chat** aus. Boards und schreibgeschützte Dokumente zeigen ihn nicht.

Beide Prompts bieten Beispiel-Chips an: **Landingpage**, **Anmeldebildschirm**, **Analyse-Dashboard** und **Preise**. Ein Chip füllt den Prompt mit einer Ausgangsidee und setzt den Fokus hinein, damit Sie ihn vor dem Senden anpassen können; gesendet wird erst mit <kbd>Enter</kbd>.

## Arbeit von der Arbeitsfläche senden

- **Haftnotiz als Prompt ausführen** im [Kontextmenü](/de/user-guide/context-menu#run-sticky-as-prompt) der Arbeitsfläche sendet den Text der ausgewählten Haftnotizen, mit einem Verweis auf jede Notiz.
- **Mit KI umsetzen** im Menü eines Kommentar-Threads bittet den Assistenten, das Feedback dieses Threads umzusetzen, in einer Antwort zu sagen, was sich geändert hat, und den Thread aufzulösen. Der Prompt zitiert den Kommentar und seine Antworten und verlinkt die Ebene, an die der Thread geheftet ist. **Offene Kommentare mit KI umsetzen** in der Kommentarliste tut dasselbe für jeden offenen Thread, den sie zeigt; aufgelöste Threads bleiben außen vor.

Beide senden in den Chat des Dokuments, stehen nur in Dokumenten zur Verfügung, die Sie bearbeiten dürfen, und richten wie der Prompt der Startseite zuerst ein Modell ein, wenn keines konfiguriert ist. Ebenen, die ein Prompt verlinkt, gehen als Referenzen mit, wie wenn Sie sie im Chatfeld erwähnen.

## Einrichtung {#einrichtung}

Beim ersten Start öffnet Pairdraw keinen Einrichtungsdialog. Solange kein Modell eingerichtet ist, sucht es einen [Coding-Agenten](/programmable/coding-agents), der bereits auf diesem Computer installiert ist: Claude Code, dann Codex, dann Gemini CLI. Ein installierter und angemeldeter Agent wird sofort zum Design-Agenten, und der Chat meldet etwa **Claude Code von diesem Computer wird verwendet.** mit **Ändern**, um ein anderes Modell zu wählen. Ein Agent, der nicht meldet, ob er angemeldet ist, etwa Gemini CLI, wird ebenfalls verwendet; stellt sich heraus, dass er abgemeldet ist, zeigt der Chat den Befehl zum Anmelden. Braucht ein Agent noch eine Anmeldung, sein ACP-Programm oder den MCP-Server, zeigt die Chat-Spalte dafür eine Schaltfläche; ohne diesen Klick wird nichts angemeldet oder installiert. Ein selbst eingerichtetes Modell wird nie ersetzt.

Findet Pairdraw keinen Agenten oder können Agenten hier nicht laufen, etwa in der Web-App ohne ihren [Begleiter](/programmable/browser-agents), öffnet das Senden eines Prompts die geführte Einrichtung. Sie fragt, wobei die KI helfen soll und was bereits vorhanden ist: ein Coding-Agent wie Claude Code, Codex, Gemini CLI oder Pi in der Desktop-App, ein API-Konto oder ein lokaler bzw. Firmenserver. Sie verbindet diesen Zugang und weist ihn den Rollen **Design-Agent** und **Vision** zu; manuell Eingerichtetes bleibt erhalten. Bei OpenRouter genügt eine Anmeldung statt eines eingefügten API-Schlüssels. Jederzeit erneut ausführen lässt sie sich über **Einstellungen → Modelle → Geführte Einrichtung starten**. Modelle manuell einrichten:

1. AI-Chat öffnen (<kbd>⌘</kbd><kbd>J</kbd>).
2. Einstellungssymbol wählen.
3. Modell hinzufügen und Anbieter, Modellkennung, Zugangsdaten und Fähigkeiten konfigurieren.
4. Modell speichern und der Rolle **Design-Agent** zuweisen.

Mehrere wiederverwendbare Modelle lassen sich einrichten und getrennt für Gestaltung, Prüfungen, schnelle Aufgaben und Bildeingaben zuweisen. Modelle derselben Anbieterverbindung verwenden dieselben gespeicherten Zugangsdaten.

Das Nachrichtenfeld wächst mit mehrzeiligen Prompts. Tippen Sie `@`, um eine Ebene, eine Seite oder einen Skill zu erwähnen, oder erwähnen Sie mit der Auswahl-Schaltfläche die ausgewählten Ebenen; `/` am Anfang einer Nachricht führt einen Skill oder einen Befehl eines ACP-Agenten aus. Erwähnungen erscheinen als Chips, auch in Antworten, in denen der Assistent die Ebenen nennt, die er bearbeitet hat; ein Klick zeigt die Ebene auf der Arbeitsfläche. Antworten des Assistenten zeigen die Überlegungen des Anbieters in einklappbaren Abschnitten und bieten pro Antwort eine Kopieraktion. Bildanhänge stehen als visuelle Referenzen zur Verfügung, wenn ein Vision-Modell konfiguriert ist. Gestreamte Antworten nutzen einen gehärteten Markdown-Renderer mit Codeblöcken, die Shiki hervorhebt; unsichere Link-Protokolle und eingebettete Datenbilder werden blockiert.

## Agent-Sitzungen

Ein Coding-Agent führt seine Sitzungen mit einem Modell, einem Überlegungsaufwand und einem Modus aus. Das Nachrichtenfeld bietet das Modell, den Überlegungsaufwand und den Modus an, die Claude Code, Codex und Gemini CLI für ihre Sitzungen ankündigen. Eine Wahl gilt sofort für die laufende Sitzung und für spätere Sitzungen mit diesem Agenten, außer Modi, die Berechtigungsanfragen überspringen; sie gelten nur für eine Sitzung.

Auf dem Desktop kann jeder Chat seinem Coding-Agenten einen Projektordner zum Arbeiten geben, gewählt in der Chat-Kopfzeile und zuerst bestätigt. Sitzungen dort starten im Standardmodus des Agenten, und nur das gewählte Modell und der Überlegungsaufwand werden übernommen.

## Schrittlimit

Unter **Einstellungen → Modelle → Chat** legt **Maximale Schritte pro Nachricht** eine ganze Zahl von 1 bis 1.000 fest. Der Standardwert ist 50. Ein gültiger Wert wird mit Enter oder beim Verlassen des Feldes gespeichert; ungültige Entwürfe ersetzen die gespeicherte Einstellung nicht. Höhere Limits erlauben längere, werkzeuggesteuerte Aufgaben, können aber Wartezeit und Anbieterkosten erhöhen.

Die integrierte KI übernimmt dieses Limit zu Beginn jeder Nachricht. Das Anhalten, Warnungen zu verbleibenden Schritten und die Aktion **Fortfahren** nutzen dasselbe Budget. Eine Änderung unterbricht keine laufende Anfrage; erst die nächste Nachricht oder Fortsetzung verwendet das neue Limit. Ein Schritt ist ein Modelldurchlauf und kann mehrere Werkzeugaufrufe enthalten. ACP- und Pi-Agenten verwalten ihre eigenen Limits.

## Werkzeugzugriff

Unter **Einstellungen → Werkzeugzugriff** legen Sie fest, welche Werkzeuge direkte Verbindungen zu AI-Modellen verwenden dürfen. Suchen Sie nach Name oder Beschreibung, klappen Sie die Gruppen der lesenden Werkzeuge oder der Werkzeuge mit Nebenwirkungen auf und schalten Sie einzelne Werkzeuge oder eine ganze Gruppe um. Gruppenschalter betreffen alle Werkzeuge der Gruppe, nicht nur die Suchtreffer. **Standard wiederherstellen** stellt die Standardauswahl wieder her: die zentralen Werkzeuge zum Bearbeiten und Untersuchen, die Bibliothekswerkzeuge (`get_components`, `list_libraries`, `insert_library_component`), Kommentare, Variablen, `lint` und `lint_fix`, `export_image`, `list_pages` und `create_page`. Erweiterte Werkzeuge wie `create_component` lassen sich einzeln aktivieren.

Die Einstellungen werden lokal gespeichert und gelten ab der nächsten Nachricht, auch in einer bestehenden Unterhaltung. Eine bereits laufende Anfrage ändern sie nicht. Viele aktivierte Werkzeuge vergrößern die Schemas, die an das Modell gesendet werden.

Der Bereich **Local MCP** hat eigene Einstellungen für Clients, die mit dem MCP-Server von Pairdraw verbunden sind, einschließlich ACP- und Pi-Agenten. Starten Sie nach einer Änderung den Server neu und verbinden Sie stdio-Clients erneut. Entfernte MCP-Verbindungen, der WebMCP-Zugriff und Pis Shell- und Dateisystemrechte bleiben davon getrennt.

Die Schalter bestimmen, welche Werkzeuge angeboten werden, nicht, welche Operationen Skripte ausführen dürfen. Ein aktiviertes `eval` oder ein anderes skriptfähiges Werkzeug kann Designoperationen ausführen, deren eigene Werkzeuge deaktiviert sind; diese Schalter sind keine Sandbox.

## Skills

Skills sind Ordner mit einer `SKILL.md` im Format [Agent Skills](https://agentskills.io/specification): Anweisungen für eine Art von Arbeit, mit optionalen Referenzdateien. Die integrierte KI sieht Name und Beschreibung jedes aktiven Skills und lädt seine Anweisungen, wenn eine Anfrage passt. Sie kann die Dateien des Skills lesen, Skripte in einem Skill laufen aber nicht.

**Einstellungen → Skills** zeigt, woher Skills kommen:

- **Hochgeladen**: Laden Sie ein ZIP des Skill-Ordners oder eine einzelne `SKILL.md` hoch. Hochgeladene Skills bleiben in Pairdraw und funktionieren auch im Browser.
- **Neben diesem Dokument** (Desktop): die Ordner `.agents/skills` und `.claude/skills` vom Ordner des geöffneten Dokuments bis hinauf zu seinem Repository. Sie bleiben aus, bis Sie **Ordner vertrauen** wählen, denn ein Skill gibt der KI Anweisungen, denen sie folgt.
- **Integriert**: Skills, die Pairdraw mitliefert. Leitfäden für Landingpages, Mobile-Apps, Web-Apps, Dashboards, Folien, Designsysteme und Tailwind CSS v4 sowie Skills für bestehende Designs: `layout`, `restyle`, `dark-mode` und `design-review`. Sie sind von Anfang an aktiv, funktionieren auch im Browser und treten hinter einen eigenen Skill mit gleichem Namen zurück.
- **Gemeinsame Agenten-Skills** und **Claude-Code-Skills** (Desktop): `~/.agents/skills` und `~/.claude/skills`, wo andere Coding-Agenten Skills installieren. Die meisten davon sind Programmier-Workflows, daher sind diese Ordner zunächst aus; der Prüfschritt der AI-Einrichtung listet ihre Skills auf, damit Sie die für Gestaltung hilfreichen auswählen.

Hochgeladene Skills sind sofort aktiv, und jeder Ordner und jeder Skill lässt sich ein- und ausschalten. Die Seite listet sie so wie der Werkzeugzugriff die Werkzeuge: Jede Quelle ist eine Gruppe mit eigenem Schalter, und jeder Skill hat einen Schalter daneben. Öffnen Sie einen Skill, um seine Anweisungen zu lesen, seine Dateien zu sehen oder Warnungen zu prüfen, wo er von der Spezifikation abweicht. Haben zwei Skills denselben Namen, gilt der erste in dieser Reihenfolge.

Um einen Skill selbst auszuführen, tippen Sie `/` am Anfang einer Nachricht und wählen ihn aus, oder Sie wählen ihn über **Skill auswählen**, die Buch-Schaltfläche unter dem Nachrichtenfeld; beides beginnt die Nachricht mit `/skill:name` und ersetzt einen vorher gewählten Skill. Pi erhält die aktiven Skills als eigene. ACP-Agenten wie Claude Code und Codex laden ihre eigenen Skills.

## Gespeicherte Unterhaltungen

Über **Chatverlauf** kehren Sie zu einem gespeicherten Chat zurück, beginnen einen **Neuer Chat** oder benennen eine Unterhaltung um bzw. löschen sie. Verlauf und Vorschauen von Anhängen werden lokal gespeichert; **Alle Chats** zeigt auch Transkripte aus anderen Dokumenten.

Eine Unterhaltung, die zu einem anderen Dokument gehört, ist schreibgeschützt, bis Sie dieses Dokument öffnen. Ein gespeichertes Agent-Transkript garantiert nicht, dass sich die Sitzung des externen Agenten fortsetzen lässt: Ist das nicht möglich, beginnen Sie einen neuen Chat. Der lokale Verlauf ist weder eine Cloud-Synchronisierung noch eine Sicherung.

In den Chat-Einstellungen neben der Modellübersicht legen Sie fest, ob Überlegungen **Standardmäßig eingeklappt**, **Beim Nachdenken ausklappen** oder **Standardmäßig ausgeklappt** angezeigt werden. Die Aufklapp-Animationen folgen der Einstellung der App für reduzierte Bewegung. Das Aufklappen älterer Überlegungen scrollt die Unterhaltung nicht zwangsweise ans Ende.

## Unterstützte Anbieter {#anbieter}

| Anbieter                 | Modelle                                                                   | Einrichtung                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen und weitere                           | API-Schlüssel von [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1 und Claude Haiku 5.5 | API-Schlüssel von [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra und GPT-6 Luna                                   | API-Schlüssel von [platform.openai.com](https://platform.openai.com)                                             |
| **ChatGPT**              | Die Modelle, die Ihr ChatGPT-Abo in Codex anbietet, live abgefragt        | Desktop-App: **Mit ChatGPT anmelden**. Antworten zählen zu den Nutzungslimits des Abos.                          |
| **Google AI**            | Gemini 3.8 Flash und Gemini 4 Argon                                       | API-Schlüssel von [aistudio.google.dev](https://aistudio.google.dev)                                             |
| **DeepSeek**             | DeepSeek Flash und DeepSeek V4 Pro                                        | API-Schlüssel von [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**                 | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX und GLM-5V-Turbo                   | API-Schlüssel laut [Z.ai-Dokumentation](https://docs.z.ai/devpack/quick-start)                                   |
| **MiniMax**              | MiniMax-M3.1-Flash und MiniMax-M3                                         | API-Schlüssel von [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                  | Grok 4.7, Grok 4.6, Grok Build 0.1                                        | API-Schlüssel von [console.x.ai](https://console.x.ai)                                                           |
| **Meta**                 | Muse Spark 1.3, Muse Wonder                                               | API-Schlüssel von [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**      | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                   | API-Schlüssel des Kimi-Code-Abos von [kimi.ai](https://www.kimi.ai/code/console). Nur in der Desktop-App.        |
| **Moonshot AI**          | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                           | API-Schlüssel von [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**          | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                    | API-Schlüssel von [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**         | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash                 | API-Schlüssel von [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**         | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                         | API-Schlüssel von [opencode.ai](https://opencode.ai/auth). Nur in der Desktop-App.                               |
| **OpenCode Go**          | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash           | API-Schlüssel des Go-Abos von [opencode.ai](https://opencode.ai/auth). Nur in der Desktop-App.                   |
| **OpenAI-kompatibel**    | Jeder Endpunkt im OpenAI-API-Format                                       | Eigene Basisadresse und Schlüssel. Umschaltbar zwischen Completions- und Responses-API.                          |
| **Anthropic-kompatibel** | Jeder Endpunkt im Anthropic-API-Format                                    | Eigene Basisadresse und Schlüssel                                                                                |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5    | Region und Bedrock-API-Schlüssel oder AWS-Zugriffsschlüssel in der Desktop-App                                   |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon      | Projekt und Standort mit Zugriffstoken; ein API-Schlüssel erreicht nur Gemini                                    |

Es gibt kein Backend: Ihr Schlüssel oder Ihre Anmeldung spricht direkt mit dem Anbieter. Im Browser gelten dessen CORS-Regeln, und Bereitstellungen unterscheiden sich darin, wie zuverlässig sie Werkzeugaufrufe streamen. Messergebnisse und Schritte zum Nachvollziehen stehen unter [BYOK-Kompatibilität von Anbietern und Modellen](/programmable/byok-provider-compatibility).

Die Vorlagen für xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI und OpenCode nutzen den OpenAI-kompatiblen Chat-Endpunkt des jeweiligen Anbieters; es unterscheiden sich also nur die Basisadresse und die empfohlenen Modelle, die vollständige Modellliste kommt von models.dev. OpenCode Zen und Go listen nur die Modelle, die sie über diesen Endpunkt bereitstellen; Claude-, GPT- und Gemini-Modelle fehlen dort, verwenden Sie dafür den Anbieter Anthropic, OpenAI oder Google AI. Kimi For Coding und beide OpenCode-Vorlagen senden keine CORS-Header und funktionieren daher nur in der Desktop-App.

**Amazon Bedrock** erreicht Claude über die Messages-API von Bedrock unter `bedrock-mantle.<region>.api.aws`, mit den `anthropic.`-Modellkennungen von Bedrock; eine eigene Modellkennung kann ein Inferenzprofil wie `us.anthropic.claude-opus-5-5` nennen. Wählen Sie die Region und melden Sie sich mit einem Bedrock-API-Schlüssel an oder in der Desktop-App mit Zugriffsschlüssel-ID, geheimem Zugriffsschlüssel und optionalem Sitzungstoken, die jede Anfrage mit AWS Signature Version 4 signieren. Browser lassen die CORS-Antwort von Bedrock den Signatur-Header nicht abdecken, daher akzeptiert die Browser-App nur API-Schlüssel.

**Google Vertex AI** stellt Claude über `:rawPredict` und Gemini über `:generateContent` in einem Google-Cloud-Projekt bereit. Geben Sie die Projekt-ID und einen Standort an (`global`, `us`, `eu` oder eine einzelne Region; einzelne Regionen bieten nur ältere Claude-Modelle) und fügen Sie ein Zugriffstoken aus `gcloud auth print-access-token` ein. Zugriffstoken laufen nach einer Stunde ab; fügen Sie ein neues ein, wenn Anfragen fehlschlagen. Ein API-Schlüssel ohne Projekt nutzt den Express-Modus von Vertex AI, der nur Gemini-Modelle bereitstellt.

**OpenRouter** lässt sich in der geführten Einrichtung per Anmeldung statt mit einem eingefügten Schlüssel verbinden: OpenRouter erstellt einen Schlüssel für Pairdraw, der wie jeder andere Schlüssel gespeichert wird. In der Desktop-App öffnet die Anmeldung den Systembrowser und kehrt zu einem vom System gewählten Port auf diesem Computer zurück (`http://localhost:<port>/oauth/openrouter`), sodass keine Webseite außerhalb Ihres Computers beteiligt ist; die Browser-App meldet sich in einem Pop-up an, erlauben Sie dafür Pop-ups.

**ChatGPT** nutzt statt eines API-Schlüssels Ihr ChatGPT-Abo, über dasselbe Backend und dieselbe Anmeldung wie die Codex CLI von OpenAI. Die Anmeldung öffnet den Browser und kehrt über `localhost:1455` zur Desktop-App zurück, die einzige Adresse, die OpenAI dafür akzeptiert; beenden Sie daher vorher ein laufendes `codex login`. Die Anmeldung wird wie ein Schlüssel gespeichert und erneuert sich selbst; die Modellliste kommt aus Ihrem Konto. Die Browser-App bietet diesen Anbieter nicht an.

## Externe MCP-Verbindungen

Der integrierte Chat und Coding-Agenten können neben dem eigenen Server von Pairdraw vertrauenswürdige [Model-Context-Protocol](https://modelcontextprotocol.io/)-Server verwenden. Fügen Sie unter **Einstellungen → MCP** im Abschnitt **MCP-Verbindungen** eine benannte Verbindung hinzu und aktivieren Sie sie:

- **Entfernter Server**: ein Streamable-HTTP-Endpunkt ohne Authentifizierung, mit Bearer-Token oder mit **OAuth-Anmeldung** für gehostete Server wie Notion oder Linear. Speichern Sie die Verbindung und klicken Sie dann auf **Anmelden**; die Anmeldeseite des Servers öffnet sich in der Web-App in einem Pop-up, auf dem Desktop im Systembrowser. Die App registriert sich beim Autorisierungsserver des Servers, verwendet PKCE und erneuert die erhaltenen Token.
- **Lokaler Befehl** (nur Desktop-App): ein Programm, das MCP über stdin und stdout spricht, etwa `npx` mit `-y`, `@modelcontextprotocol/server-filesystem` und einem Ordner als Argumente, eines pro Zeile, dazu optionale Umgebungsvariablen `NAME=value`. Beim ersten Ausführen einer Befehlszeile fragt die App in einem Systemdialog nach; sie fragt erneut, wenn sich das Programm, ein Argument oder ein Variablenname ändert. Variablen, die das Programm auswählen oder Code hineinladen, etwa `PATH`, `NODE_OPTIONS` oder `LD_PRELOAD`, werden abgelehnt.

Der Chat mit direkter API listet die Werkzeuge jedes aktivierten Servers mit jeder Nachricht und bietet sie dem Modell als `mcp__<server>__<tool>` an. Ein Server, der nicht antwortet, wird für diese Nachricht ausgelassen und eine Minute später erneut versucht; einen abgelehnten lokalen Befehl fragt die App erst wieder an, wenn Sie seine Verbindung ändern. Alle Chats teilen sich die Verbindungen; sie bleiben offen, solange eine Antwort läuft, und schließen nach einigen untätigen Minuten. Solange der Chat vor Aktionen nachfragt (**Einstellungen → KI**), fragt er auch vor jedem Aufruf eines externen Werkzeugs, das sein Server nicht als nur lesend kennzeichnet. Externe Werkzeuge werden mit ihrer Verbindung ein- und ausgeschaltet, nicht in der Liste der eigenen Werkzeuge von Pairdraw. Auf dem Desktop erhalten ACP-Agenten dieselben Verbindungen beim Start ihrer Sitzung; ein lokaler Befehl wird einem Agenten erst übergeben, nachdem Sie ihn im selben Systemdialog bestätigt haben, und die Web-App übergibt keine. Pi erhält die entfernten Verbindungen. Bearer-Token, OAuth-Anmeldungen und Variablen liegen im konfigurierten Anmeldedatenspeicher statt in den normalen Einstellungen. **Verbindung testen** verbindet sich einmal und meldet, wie viele Werkzeuge der Server anbietet.

In der Web-App muss ein entfernter Server Anfragen vom Ursprung der App zulassen (CORS); die Desktop-App verbindet sich über ihren eigenen HTTP-Client.

Entfernte Server müssen HTTPS verwenden; für lokale Entwicklung sind Loopback-Adressen über HTTP erlaubt. Prüfen Sie einen Server und vertrauen Sie ihm, bevor Sie ihn aktivieren: Seine Werkzeuge können externe Daten lesen oder mit den angegebenen Zugangsdaten Aktionen ausführen. Der integrierte Design-MCP-Server von Pairdraw ist automatisch angebunden und muss hier nicht hinzugefügt werden.

## Was der Assistent kann {#werkzeuge}

Der konfigurierbare Werkzeugkatalog umfasst 142 Werkzeuge in diesen Kategorien; welche einem Modell angeboten werden, hängt von den Einstellungen unter Werkzeugzugriff ab:

- **Erstellen**: Rahmen, Formen, Text, Komponenten, Seiten. Rendert JSX für komplexe Layouts.
- **Gestalten**: Füllungen, Konturen, Effekte, Deckkraft, Eckenradius, Mischmodi.
- **Anordnung**: Auto-Layout, Raster, Ausrichtung, Abstände, Größen.
- **Komponenten**: Komponenten, Instanzen, Komponentensets und Slots erstellen, Overrides verwalten. Komponenten Reka-UI-Verhalten geben, damit sie in der Vorschau funktionieren.
- **Variablen**: Variablen, Sammlungen und Modi erstellen und bearbeiten, an Füllungen binden.
- **Abfragen**: Objekte finden, XPath-Selektoren, Eigenschaften lesen, Seiten, Schriften und Auswahl auflisten.
- **Untersuchen**: `get_jsx` für die JSX-Ansicht im Round-Trip, `diff_create` und `diff_jsx` für strukturelle Diffs, `diff_visual` für Pixel-Diffs, `describe` für semantische Rolle und das Erkennen von Designproblemen.
- **Analysieren**: Farbpalette, Typografie-Prüfung, Konsistenz der Abstände, Erkennung von Clustern.
- **Exportieren**: PNG, SVG, JSX mit Tailwind-Klassen. Visuelle Prüfung über `export_image`.
- **Vektor**: boolesche Operationen, Pfadbearbeitung.

## Varianten erkunden

**Kochen lassen**, die Kochmütze unter dem Nachrichtenfeld, erkundet eine Anfrage, statt sie einmal zu beantworten:

- **Varianten** fordert zwei bis sechs Entwürfe nebeneinander an, jeder ein neuer Rahmen oberster Ebene rechts neben allem auf der Seite. Wählen Sie, ob sie das **Layout** (Aufbau und Anordnung bei einem Stil) oder den **Stil** (Farben, Schrift und Bilder bei einem Layout) erkunden. Ist eine Ebene ausgewählt oder erwähnt, gehen die Varianten von ihr aus und lassen sie unverändert.
- **Nicht iterieren** fordert einen Entwurf in einem Durchgang an, ohne die Prüfung und Überarbeitung, die der Assistent sonst vornimmt.

Die Auswahl bleibt für die nächsten Nachrichten aktiv, und die Schaltfläche zeigt sie an, bis Sie sie wieder auf **Aus** stellen.

## Notizen für die KI

Wählen Sie eine Ebene und fügen Sie unten im Design-Panel **Notizen für die KI** hinzu. **Kontext** sagt Agenten, was die Ebene bedeutet oder tut, etwa „öffnet den Registrierungsdialog“; **Prompt** ist eine Anfrage zu der Ebene, die **Prompt ausführen** an den Chat sendet. Eine Nachricht enthält die Notizen der Ebenen, die sie betrifft: die erwähnten und die Auswahl, ohne beides die ganze Seite. Agenten beachten den Kontext und handeln nach einem Prompt nur auf Anfrage. Notizen werden mit der Ebene in der Datei gespeichert; `context`-Notizen und Prompt-Karten aus `.pen`-Dateien werden genauso gelesen.

## Visuelle Prüfung

Der Assistent kann seine Arbeit visuell prüfen. Mit `export_image`, standardmäßig aktiviert, nimmt er nach dem Erstellen oder Ändern von Designs einen Screenshot auf und vergleicht das Ergebnis mit der ursprünglichen Anfrage. Dadurch werden Anordnungsfehler, fehlende Elemente und abweichende Farben sichtbar, die reine Textantworten übersehen würden. `diff_visual`, ebenfalls standardmäßig aktiviert, vergleicht ein bearbeitetes Objekt mit einer Referenzkopie und liefert die geänderten Pixel und den betroffenen Bereich, sodass der Assistent prüfen kann, ob eine Änderung auf ihr Ziel beschränkt blieb.

## Nachrichten während der Arbeit

Sie können weitertippen, während eine Antwort läuft. **Enter** sendet die Nachricht, sobald die Werkzeugaufrufe des aktuellen Schritts fertig sind, sodass die integrierte KI die Richtung ändern kann, ohne angehalten zu werden; **Alt+Enter** wartet, bis sie ihre gesamte Arbeit beendet hat. Wartende Nachrichten erscheinen abgeblendet unter der Antwort, jede mit einer Schaltfläche zum Entfernen. **Escape** hält die Antwort an und sendet die wartenden Nachrichten sofort, und **Pfeil nach oben** in der ersten Zeile holt wartende Nachrichten zum Bearbeiten zurück. ACP-Agenten und Pi übernehmen eine wartende Nachricht, sobald ihr Zug endet.

## Eine Antwort anhalten

**Generierung stoppen** beendet eine Antwort sofort. Ein bereits laufender Werkzeugaufruf wird zu Ende geführt, und seine Änderung zählt zur Antwort; Aufrufe, die noch auf ihren Zug warten, ändern nichts. Die Antwort wird als _Gestoppt_ markiert, ihre Überlegungen und unfertigen Aufrufe erscheinen nicht mehr als laufend, und Ihre nächste Nachricht teilt dem Assistenten mit, ob diese Aufrufe das Dokument geändert haben.

## Änderungen des Assistenten rückgängig machen

Jeder Werkzeugaufruf, der das Dokument ändert, ist ein Schritt unter Bearbeiten → Rückgängig. Wird er mit <kbd>⌘</kbd><kbd>Z</kbd> rückgängig gemacht, markiert der Chat den Aufruf als _Rückgängig gemacht_. Eine Antwort, von der nur einige Änderungen rückgängig gemacht sind, nennt deren Anzahl; eine, bei der alle rückgängig gemacht sind, wird abgeblendet und als _Änderungen rückgängig gemacht_ markiert. Wiederholen entfernt die Markierungen. Die Markierungen werden mit der Unterhaltung gespeichert.

**Änderungen zurücknehmen** an einer Antwort macht ihre Änderungen rückgängig, solange seitdem nichts bearbeitet wurde, und **Änderungen wiederherstellen** holt rückgängig gemachte Änderungen zurück, solange Wiederholen das noch kann. **Neu generieren** und das Bearbeiten Ihrer letzten Nachricht machen zuerst die Änderungen der ersetzten Antwort rückgängig, wenn möglich.

Ihre nächste Nachricht teilt dem Assistenten mit, welche seiner Änderungen Sie rückgängig gemacht oder wiederholt haben, damit er nicht auf Änderungen aufbaut, die nicht mehr existieren. Machen Sie Änderungen des Assistenten rückgängig, während er noch arbeitet, erfährt er es mit seinem nächsten Werkzeugaufruf.

## Dem Assistenten folgen

Ist **Agenten bei der Arbeit folgen** aktiviert, die Fadenkreuz-Schaltfläche oben im AI-Chat, folgt Ihre Ansicht dem Assistenten während der Arbeit, auch auf eine andere Seite, wenn er dort Ebenen bearbeitet. Das Folgen endet, wenn die Antwort fertig ist, angehalten wird oder fehlschlägt. Klicken, Scrollen, Zoomen, ein Seitenwechsel oder Escape beenden das Folgen ebenfalls.

## Dem Assistenten beim Zeichnen zusehen {#watching-the-assistant-draw}

Während ein Agent die geöffnete Seite bearbeitet, ob der integrierte Chat oder ein Coding-Agent über MCP, zeigt die Arbeitsfläche seine Arbeit: Jede Ebene, die er hinzufügt, zeichnet sich nacheinander ein, geänderte Ebenen blinken auf, und die Rahmen, in denen er arbeitet, schimmern in einem violetten Umriss. Hört er auf, blinken sie einmal, und ein Hinweis zählt die hinzugefügten und geänderten Ebenen; **Anzeigen** wählt sie aus und zoomt auf sie. Die Bewegung wird über die Arbeitsfläche gezeichnet und ändert das Dokument nie. Ausschalten lässt sie sich mit **KI-Änderungen animieren** unter **Einstellungen → Modelle → Chat**; sie bleibt auch aus, solange **Animationen** aus ist, das System reduzierte Bewegung verlangt oder der Ultralight-Modus an ist, und die Änderungen erscheinen dann einfach.

## Benachrichtigungen

Bittet ein Agent um eine Berechtigung und haben Sie einige Sekunden lang nicht geantwortet, sendet Pairdraw eine Systembenachrichtigung, sodass Sie währenddessen in einer anderen App arbeiten können. Unter **Einstellungen → Benachrichtigungen** lassen sich außerdem Benachrichtigungen einschalten, wenn eine Antwort fertig ist oder fehlschlägt. Sie werden nur gesendet, solange Pairdraw im Hintergrund ist oder ein anderes Dokument zeigt, und ein Klick öffnet den Chat des betreffenden Dokuments. Im Browser klicken Sie dort zuerst auf **Mitteilungen erlauben**; die Desktop-App folgt den Benachrichtigungseinstellungen Ihres Systems.

## Beispiel-Prompts

- „Erstelle eine Karte mit Titel, Beschreibung und einem blauen Button“
- „Gib allen Buttons auf dieser Seite denselben Eckenradius“
- „Welche Schriften werden in dieser Datei verwendet?“
- „Ändere den Hintergrund des ausgewählten Rahmens in einen Verlauf von Blau nach Lila“
- „Exportiere den ausgewählten Rahmen als SVG“
- „Finde alle Textobjekte mit einer Schriftgröße unter 12“
- „Beschreibe die ausgewählte Komponente: Nach welcher Rolle sieht sie aus?“
- „Zeig mir das JSX für diesen Rahmen“
- „Mach aus dieser Komponente einen Schalter, den ich in der Vorschau ausprobieren kann“

## Hinweise

- Vor der Anfrage die betreffenden Objekte auswählen; der Assistent kennt die aktuelle Auswahl.
- Farben, Größen und Positionen möglichst genau angeben.
- Eine Nachricht kann mehrere Objekte ändern.
- Während eine Antwort läuft, können Sie andere Seiten ansehen: Der Assistent arbeitet auf der Seite weiter, auf der die Nachricht begonnen hat, und seine Vorschauen erscheinen, sobald Sie zurückkehren. Solange Sie woanders sind, nennt der Chat die Seite, an der gearbeitet wird, mit **Zur Seite**, um dorthin zurückzukehren.
- Was Ihnen nicht gefällt, machen Sie mit Bearbeiten → Rückgängig oder **Änderungen zurücknehmen** rückgängig; der Chat und der Assistent sehen beides.
- Nach jedem Werkzeugaufruf wird die Anordnung automatisch neu berechnet.
