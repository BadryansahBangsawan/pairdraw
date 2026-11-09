---
title: AI-Chat
description: Integrierter AI-Assistent mit mehr als 90 Werkzeugen zum Erstellen und Bearbeiten von Designs.
---

# AI-Chat

<kbd>⌘</kbd><kbd>J</kbd> beziehungsweise <kbd>Strg</kbd><kbd>J</kbd> oder die Schaltfläche mit den Funkeln bei den Aktionen des Dokuments in der oberen Leiste öffnet den Assistenten in einer eigenen Spalte. Eine Anweisung kann Formen erstellen, Stile ändern, die Anordnung konfigurieren, Komponenten bearbeiten oder das Dokument analysieren.

## Einrichtung

Beim ersten Start fragt die geführte Einrichtung, wobei die KI helfen soll und was bereits vorhanden ist: ein Coding-Agent wie Claude Code, Codex oder Gemini CLI in der Desktop-App, ein API-Konto oder ein lokaler bzw. Firmenserver. Sie verbindet diesen Zugang und weist ihn den Rollen **Design agent** und **Vision** zu; manuell Eingerichtetes bleibt erhalten. Bei OpenRouter genügt eine Anmeldung statt eines eingefügten API-Schlüssels. Sie lässt sich überspringen und jederzeit über **Einstellungen → KI und Agenten → Geführte Einrichtung starten** erneut ausführen. Modelle manuell einrichten:

1. AI-Chat öffnen.
2. Einstellungssymbol wählen.
3. Modell hinzufügen und Anbieter, Modellkennung, Zugangsdaten und Fähigkeiten konfigurieren.
4. Modell speichern und der Rolle **Design agent** zuweisen.

Mehrere Modelle können getrennt für Gestaltung, Prüfung, schnelle Aufgaben und Bildeingaben verwendet werden. Modelle derselben Anbieterverbindung verwenden dieselben sicher gespeicherten Zugangsdaten.

### Anbieter

| Anbieter                 | Beispiele                                                                 | Einrichtung                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen und weitere                           | API-Schlüssel von [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1 und Claude Haiku 5.5 | API-Schlüssel von [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra und GPT-6 Luna                                   | API-Schlüssel von [platform.openai.com](https://platform.openai.com)                                             |
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
| **OpenAI-kompatibel**    | Endpunkt im OpenAI-API-Format                                             | Eigene Basisadresse und Schlüssel                                                                                |
| **Anthropic-kompatibel** | Endpunkt im Anthropic-API-Format                                          | Eigene Basisadresse und Schlüssel                                                                                |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5    | Region und Bedrock-API-Schlüssel oder AWS-Zugriffsschlüssel in der Desktop-App                                   |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon      | Projekt und Standort mit Zugriffstoken; ein API-Schlüssel erreicht nur Gemini                                    |

Anfragen gehen direkt an den Anbieter. Im Browser gelten dessen CORS-Regeln. Bereitstellungen unterscheiden sich darin, wie zuverlässig Werkzeugaufrufe gestreamt werden. Messergebnisse stehen unter [BYOK-Kompatibilität](/programmable/byok-provider-compatibility).

### Externe MCP-Verbindungen

Desktop-ACP-Agenten können vertrauenswürdige entfernte MCP-Server verwenden. Unter **Einstellungen → MCP-Verbindungen** wird ein Streamable-HTTP-Endpunkt hinzugefügt, optional ein Bearer-Token gespeichert und die Verbindung aktiviert.

Token werden im Anmeldedatenspeicher und erst beim Start einer ACP-Sitzung gelesen. Entfernte Server müssen HTTPS verwenden; für lokale Entwicklung sind Loopback-Adressen über HTTP erlaubt.

Auch der eingebaute Chat mit direkter API nutzt aktivierte Verbindungen: Er bietet ihre Werkzeuge dem Modell als `mcp__<Server>__<Werkzeug>` an. Gehostete Server wie Notion oder Linear melden dich über **OAuth-Anmeldung** an; speichere die Verbindung und klicke dann auf **Anmelden**. In der Desktop-App kann eine Verbindung außerdem ein **lokaler Befehl** sein, ein Programm, das MCP über stdin und stdout spricht, mit einem Argument pro Zeile und optionalen Umgebungsvariablen `NAME=Wert`. Vor dem ersten Ausführen einer Befehlszeile fragt die App in einem Systemdialog nach; Variablen wie `PATH` oder `NODE_OPTIONS`, die Code laden, sind nicht erlaubt. Solange der Chat vor Aktionen nachfragt, fragt er auch vor jedem externen Werkzeug, das sein Server nicht als nur lesend kennzeichnet. In der Web-App muss ein entfernter Server Anfragen vom Ursprung der App zulassen (CORS).

## Agent-Sitzungen

Ein Coding-Agent führt seine Sitzungen mit einem Modell, einem Überlegungsaufwand und einem Modus aus. Das Nachrichtenfeld bietet das Modell, den Überlegungsaufwand und den Modus an, die Claude Code, Codex und Gemini CLI für ihre Sitzungen ankündigen. Eine Wahl gilt sofort für die laufende Sitzung und für spätere Sitzungen mit diesem Agenten, außer Modi, die Berechtigungsanfragen überspringen; sie gelten nur für eine Sitzung.

Auf dem Desktop kann jeder Chat seinem Coding-Agenten einen Projektordner zum Arbeiten geben, gewählt in der Chat-Kopfzeile und zuerst bestätigt. Sitzungen dort starten im Standardmodus des Agenten, und nur das gewählte Modell und der Überlegungsaufwand werden übernommen.

## Werkzeuge

Der Assistent verfügt über mehr als 90 Werkzeuge für Erstellung, Gestaltung, Anordnung, Komponenten, Variablen, Suche, Prüfung, Analyse, Export und Vektorbearbeitung.

## Skills

Skills sind Ordner mit einer `SKILL.md` im Format [Agent Skills](https://agentskills.io/specification): Anweisungen für eine Art von Arbeit, mit optionalen Referenzdateien. Die eingebaute KI sieht Name und Beschreibung jedes aktiven Skills und lädt seine Anweisungen, wenn eine Anfrage passt; Skripte in einem Skill laufen nicht.

Unter **Einstellungen → Skills** lädst du einen Skill als ZIP seines Ordners oder als `SKILL.md` hoch. In der Desktop-App kommen `~/.agents/skills` und `~/.claude/skills` dazu sowie die Ordner `.agents/skills` und `.claude/skills` neben dem geöffneten Dokument, die erst nach **Ordner vertrauen** gelten. Integrierte Skills liefert Pairdraw gleich mit: Leitfäden für Landingpages, Mobile-Apps, Web-Apps, Dashboards, Folien, Designsysteme und Tailwind CSS v4 sowie `layout`, `restyle`, `dark-mode` und `design-review` für bestehende Designs; ein eigener Skill mit gleichem Namen hat Vorrang. Tippe `/` am Anfang einer Nachricht oder nutze **Skill auswählen** unter dem Eingabefeld, um einen Skill auszuwählen, und `@`, um eine Ebene, eine Seite oder einen Skill zu erwähnen. Erwähnungen erscheinen als Chips, auch in den Antworten; ein Klick zeigt die Ebene auf der Arbeitsfläche.

## Varianten erkunden

**Kochen lassen**, die Kochmütze unter dem Nachrichtenfeld, erkundet eine Anfrage, statt sie einmal zu beantworten:

- **Varianten** fordert zwei bis sechs Entwürfe nebeneinander an, jeder ein neuer Rahmen oberster Ebene rechts neben allem auf der Seite. Wähle, ob sie das **Layout** (Aufbau und Anordnung bei einem Stil) oder den **Stil** (Farben, Schrift und Bilder bei einem Layout) erkunden. Ist eine Ebene ausgewählt oder erwähnt, gehen die Varianten von ihr aus und lassen sie unverändert.
- **Nicht iterieren** fordert einen Entwurf in einem Durchgang an, ohne die Prüfung und Überarbeitung, die der Assistent sonst vornimmt.

Die Auswahl bleibt für die nächsten Nachrichten aktiv, und die Schaltfläche zeigt sie an, bis du sie wieder auf **Aus** stellst.

## Notizen für die KI

Wähle eine Ebene und füge unten im Design-Panel **Notizen für die KI** hinzu. **Kontext** sagt Agenten, was die Ebene bedeutet oder tut, etwa „öffnet den Registrierungsdialog“; **Prompt** ist eine Anfrage zu der Ebene, die **Prompt ausführen** an den Chat sendet. Eine Nachricht enthält die Notizen der Ebenen, die sie betrifft: die erwähnten und die Auswahl, ohne beides die ganze Seite. Agenten beachten den Kontext und handeln nach einem Prompt nur auf Anfrage. Notizen werden mit der Ebene in der Datei gespeichert; `context`-Notizen und Prompt-Karten aus `.pen`-Dateien werden genauso gelesen.

## Visuelle Prüfung

Nach Änderungen kann der Assistent das Ergebnis mit `export_image` rendern und mit der Anfrage vergleichen. Dadurch werden Anordnungsfehler, fehlende Elemente und abweichende Farben sichtbar. `diff_visual`, standardmäßig aktiviert, vergleicht ein bearbeitetes Objekt mit einer Referenzkopie und liefert die geänderten Pixel und den betroffenen Bereich, sodass der Assistent prüfen kann, ob eine Änderung auf ihr Ziel beschränkt blieb.

## Hinweise

- Vor der Anfrage die betreffenden Objekte auswählen; der Assistent kennt die aktuelle Auswahl.
- Farben, Größen und Positionen möglichst genau angeben.
- Eine Nachricht kann mehrere Objekte ändern.
- Während eine Antwort läuft, können Sie andere Seiten ansehen: Der Assistent arbeitet auf der Seite weiter, auf der die Nachricht begonnen hat, und seine Vorschauen erscheinen, sobald Sie zurückkehren. Solange Sie woanders sind, nennt der Chat die Seite, an der gearbeitet wird, mit **Zur Seite**, um dorthin zurückzukehren. Wechselt der Assistent selbst die Seite, folgt Ihre Ansicht.
- Änderungen durch AI können rückgängig gemacht werden.
- Nach jedem Werkzeugaufruf wird die Anordnung neu berechnet.
