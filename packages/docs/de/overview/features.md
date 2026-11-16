# Funktionen

## Figma-Dateien

Pairdraw öffnet und speichert native Figma-Dateien direkt. Import und Export verwenden denselben Kiwi-Binärcodec wie Figma, mit 605 Schemadefinitionen und rund 590 Feldern pro Objekt. Speichern: <kbd>⌘</kbd><kbd>S</kbd>, Speichern unter: <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Kopieren und Einfügen mit Figma:** Objekte in Figma auswählen, <kbd>⌘</kbd><kbd>C</kbd> drücken, zu Pairdraw wechseln und mit <kbd>⌘</kbd><kbd>V</kbd> einfügen. Füllungen, Konturen, Auto-Layout, Text, Effekte, Eckenradien und Vektornetzwerke bleiben erhalten. Das funktioniert in beide Richtungen.

## Zeichnen und Bearbeiten

- **Formen:** Rechteck (<kbd>R</kbd>), Ellipse (<kbd>O</kbd>), Linie (<kbd>L</kbd>), Polygon und Stern.
- **Zeichenstift:** Vektornetzwerke statt einfacher Pfade, Bézierkurven mit Tangentengriffen.
- **Bleistift** (<kbd>⇧</kbd><kbd>P</kbd>): Freihandstriche, die zu bearbeitbaren Kurven geglättet werden.
- **Text:** Bearbeitung direkt auf der Arbeitsfläche, IME-Unterstützung und Doppelklick zum Wechsel in den Bearbeitungsmodus.
- **Formatierter Text:** Fett (<kbd>⌘</kbd><kbd>B</kbd>), Kursiv (<kbd>⌘</kbd><kbd>I</kbd>), Unterstrichen (<kbd>⌘</kbd><kbd>U</kbd>) und Durchgestrichen für einzelne Zeichen.
- **Auto-Layout:** Flexbox und CSS Grid über Yoga WASM mit Richtung, Abstand, Innenabstand, Verteilung, Ausrichtung, Größenmodi der Kinder und Rasterspuren. Ein- und ausschalten mit <kbd>⇧</kbd><kbd>A</kbd>.
- **Komponenten:** Erstellen (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>), Komponentensätze, Instanzen mit Überschreibungen, Slots und Live-Synchronisierung.
- **Verhalten und Vorschau:** Komponenten arbeiten als Reka-UI-Steuerelemente (Schalter, Schieberegler, Tabs, Textfeld, Akkordeon, …) und lassen sich mit <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> live über der Arbeitsfläche ausprobieren ([Komponenten](/de/user-guide/components#behaviours-and-preview)).
- **Skript-Ebenen:** Der Inhalt einer Ebene wird von einem im Dokument gespeicherten JavaScript-Programm gezeichnet. `@input`-Steuerelemente lassen sich an Variablen binden; Änderungen am Code, an den Eingaben oder an der Größe lösen einen neuen Lauf aus, und das Ergebnis lässt sich mit einem Schritt in gewöhnliche Ebenen umwandeln ([Skript-Ebenen](/user-guide/script-layers)).
- **Prototypen:** Klick- oder Verzögerungsinteraktionen auf einer Ebene führen zu einem Frame, öffnen oder schließen eine Überlagerung oder gehen zurück; abspielbar auf der Arbeitsfläche mit sofortigem oder aufgelöstem Übergang ([Prototyp abspielen](/user-guide/playing-a-prototype)).
- **Variablen:** Designtoken mit Sammlungen, Modi wie Hell und Dunkel, den Typen Color, Float, String und Boolean sowie Variablenbindungen.
- **Sektionen:** Container zur Organisation, die überlappende Objekte automatisch übernehmen und ihren Titel als Etikett zeigen.

## Aufbau des Editors

Der Editor öffnet nur mit der Arbeitsfläche. Die Werkzeuge stehen links auf der Arbeitsfläche, darüber der Schalter für das Ebenen-Panel, und der Zoom sitzt in der rechten unteren Ecke. Das Eigenschaften-Panel erscheint, wenn eine Ebene ausgewählt ist, und verschwindet mit der Auswahl; ein über seinen Schalter geöffnetes Panel bleibt offen. Solange der AI-Chat geschlossen ist, schickt ein Eingabefeld am unteren Rand der Arbeitsfläche, was Sie schreiben, an den Chat. Die App startet im dunklen Thema; **Einstellungen → Allgemein → Thema** bietet außerdem Hell und Automatisch.

- **Ebenen suchen:** <kbd>⌘</kbd><kbd>F</kbd> durchsucht die Ebenen der angezeigten Seite nach Namen, wählt den gewählten Treffer aus und holt ihn in die Ansicht.
- **Extras:** Die Geschenk-Schaltfläche in der oberen Leiste sammelt Ausgangspunkte: Stile, die Sie an den AI-Chat anheften, Designsysteme zum Aktivieren, Skripte, die als Code-Ebenen platziert werden, und fertige Shader.

## Eigenschaften

Die Registerkarten Design und Code passen sich der aktuellen Auswahl an, daneben steht Prüfen:

- **Darstellung:** Deckkraft, einheitlicher oder separater Eckenradius und Sichtbarkeit.
- **Füllung:** Volltonfarbe, Verläufe (linear, radial, Winkel, Diamant, Mesh) und Bilder.
- **Kontur:** Farbe, Stärke, Ausrichtung (innen, mittig, außen), separate Stärke pro Seite, Enden, Verbindungen und Strichelung.
- **Effekte:** Schlagschatten, innerer Schatten sowie Ebenen-, Hintergrund- und Vordergrundunschärfe.
- **Typografie:** Schriftwahl mit Suche und virtuellem Scrollen, Schnitt, Größe, Ausrichtung und Formatierungsschaltflächen.
- **Layout:** Einstellungen des Auto-Layouts, wenn es aktiviert ist.
- **Export:** Maßstab, Format (PNG, JPG, WEBP, SVG, PDF, HTML), Qualität und Live-Vorschau.
- **Code:** Design JSX, HTML sowie Vue- und React-Komponenten für die Auswahl, gestaltet mit CSS oder Tailwind. Design JSX lässt sich live in beide Richtungen bearbeiten: Der Code wird angepasst, wenn sich Ebenen ändern. Das Element an der Cursorposition umrandet seine Ebene auf der Arbeitsfläche, und Designprobleme werden an der Eigenschaft unterstrichen, die sie verursacht.
- **Prüfen:** Live-Designprüfung für die Seite oder die Auswahl: geringer Kontrast, kleine Touch-Ziele, nicht gebundene Farben, Abstände außerhalb der Skala, geprüft, solange die Registerkarte offen ist, mit Variablenbindung per Klick ([Designs prüfen](/user-guide/checking-designs)).

## Darstellung

Skia über CanvasKit WASM ist dieselbe Grafik-Engine, die auch Figma verwendet. Pairdraw unterstützt unter anderem:

- lineare, radiale, Winkel- und Diamantverläufe;
- Bildfüllungen mit verschiedenen Skalierungsarten;
- Effekte mit Zwischenspeicherung pro Objekt;
- Bögen, partielle Ellipsen und Ringe;
- Auslassen nicht sichtbarer Objekte und Wiederverwenden von Zeichenwerkzeugen;
- Fanglinien mit Berücksichtigung der Drehung;
- Lineale mit Markierung des Auswahlbereichs;
- Hervorhebung entlang der tatsächlichen Geometrie.

## Rückgängig und Wiederholen

Jede Operation lässt sich rückgängig machen: Erstellen, Löschen, Verschieben, Größenänderung, Eigenschaftsänderungen, Wechsel des übergeordneten Objekts, Layoutänderungen und Variablenoperationen. Dahinter steht ein Muster mit inversen Befehlen. Tastenkürzel: <kbd>⌘</kbd><kbd>Z</kbd> und <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Mehrseitige Dokumente

Seiten können hinzugefügt, gelöscht und umbenannt werden. Jede Seite behält ihre eigene Ansichtsposition und Vergrößerung. Ein Doppelklick benennt eine Seite direkt um.

## Mehrere Dateien in Tabs

Mehrere Dokumente lassen sich in Tabs öffnen: <kbd>⌘</kbd><kbd>T</kbd> öffnet einen neuen Tab, <kbd>⌘</kbd><kbd>W</kbd> schließt ihn, <kbd>⌘</kbd><kbd>O</kbd> öffnet eine Datei.

## Export

- **Bilder:** PNG, JPG und WEBP in einstellbarem Maßstab (0,5× bis 4×), über das Panel, das Kontextmenü oder <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>.
- **SVG:** Formen, Text mit Stilbereichen, Verläufe, Effekte und Mischmodi.
- **PDF:** eine Ebene pro Seite, oder **Datei → Rahmen als PDF exportieren…** für die Frames der Seite.
- **HTML:** eine Seite oder ein Fragment mit reinem CSS oder Tailwind-Klassen.
- **Tailwind JSX:** HTML mit Tailwind-v4-Utility-Klassen, bereit für React oder Vue.
- **Kopieren als:** Text, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>) oder JSX über das Kontextmenü.

CLI: `pairdraw export design.fig -f jsx --style tailwind`

## AI-Chat

<kbd>⌘</kbd><kbd>J</kbd> öffnet den Assistenten in einer eigenen Spalte neben dem Eigenschaften-Panel; alternativ schreiben Sie in das Eingabefeld am unteren Rand der Arbeitsfläche oder auf der Startseite. Ist kein Modell eingerichtet, nutzt der Chat einen bereits auf diesem Computer installierten Coding-Agenten: Claude Code, Codex oder Gemini CLI. 139 Werkzeuge erstellen Formen, ändern Stile, verwalten Layouts, bearbeiten Komponenten und Variablen, führen boolesche Operationen aus, analysieren Designtoken und exportieren Ressourcen. Verbinden lassen sich Anthropic, OpenAI, Google AI, OpenRouter, jeder kompatible Endpunkt oder die KI, die Ihr [Pairdraw-Cloud](/user-guide/pairdraw-cloud#ai-on-cloud)-Server anbietet. Jeder Anbieter, jedes Modell und jeder Agent zeigt das Logo seines Herstellers.

Werkzeugaufrufe erscheinen als einklappbare Einträge auf einer Zeitleiste. Zur visuellen Prüfung stellt der Assistent seine Arbeit dar und vergleicht das Ergebnis mit Ihrer Anfrage. Sämtliche Änderungen durch AI können rückgängig gemacht werden.

Sie können einem Agenten beim Zeichnen zusehen: Jede Ebene, die er hinzufügt, zeichnet sich nacheinander ein, die Rahmen, in denen er arbeitet, schimmern, und sobald er fertig ist, zählt ein Hinweis, was er hinzugefügt und geändert hat. **KI-Änderungen animieren** in den Einstellungen schaltet das aus ([Dem Assistenten beim Zeichnen zusehen](/de/programmable/ai-chat#watching-the-assistant-draw)).

Einrichtung und Anbieter beschreibt [AI-Chat](/de/programmable/ai-chat).

## Integrierter Browser

`http`- und `https`-Seiten öffnen sich in einem eigenen Fenster der Desktop-App, das nichts mit dem Editor teilt, und lassen sich auf die Arbeitsfläche holen: die ganze Seite oder ein ausgewähltes Element als Ebenen importieren oder einen Screenshot der Ansicht, der Seite oder eines Elements ablegen. Der Chat kann die Seite lesen, ein Element in der Antwort markieren und darauf klicken, tippen, eine Taste drücken, scrollen oder warten; gefragt wird vorher, wenn die Einstellungen vor Änderungen fragen.

In einem vorhandenen Board wird derselbe Browser zur Recherche: Der Chat zitiert die Seite in eine Haftnotiz mit Adresse, Titel, Zitat und Lesezeit ([Recherche auf einem Board](/user-guide/research)). Neue Boards erstellt Pairdraw nicht.

## MCP-Server

Claude Code, Cursor, Windsurf und andere MCP-Clients können `.fig`-Dateien ohne grafische Oberfläche lesen und verändern. 139 Werkzeuge. Als Übertragung stehen stdio und HTTP zur Verfügung.

```sh
npm install -g @pairdraw/mcp
```

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Die vollständige Werkzeugliste steht in der [MCP-Referenz](/programmable/mcp-server).

## CLI

`.fig`-Dateien lassen sich im Terminal untersuchen, exportieren und analysieren:

```sh
pairdraw tree design.fig              # Objektbaum
pairdraw find design.fig --type TEXT  # Suche
pairdraw export design.fig -f png     # Rendern
pairdraw analyze colors design.fig    # Farbanalyse
pairdraw analyze clusters design.fig  # Wiederkehrende Strukturen
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Läuft die Desktop-App, lassen Sie die Datei weg, um den laufenden Editor per RPC zu steuern:

```sh
pairdraw tree                     # Geöffnetes Dokument
pairdraw export -f png            # Screenshot der Arbeitsfläche
```

Alle Befehle unterstützen `--json`. Installation: `npm install -g @pairdraw/cli` oder `bun add -g @pairdraw/cli`.

## Zusammenarbeit

Pairdraw hat keine Live-Räume zwischen Peers: Für ein lokales Dokument gibt es keinen Freigabelink, keinen Beitritt per Raum-ID und keinen Sprachanruf. Dokumente auf einem [Pairdraw-Cloud](/user-guide/pairdraw-cloud)-Server werden über diesen Server geteilt, und alle, die eines öffnen, bearbeiten es live.

- Live-Zeiger mit farbigen Pfeilen und Namensetiketten, für Personen in einem Cloud-Dokument und für KI-Agenten.
- Anwesenheits-Avatare; Ihr eigener erscheint in der oberen Leiste nur, solange er Ihre KI-Agenten auflistet oder jemand anderes das Cloud-Dokument geöffnet hat.
- Folgemodus: Klicken Sie auf eine Person oder einen Agenten, um seiner Ansicht zu folgen.
- **Ansicht → Multiplayer-Cursor** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) blendet die Zeiger aus und ein.

Mehr dazu unter [Zusammenarbeit](/de/programmable/collaboration).

## Desktop und Web

**Desktop:** Tauri v2, mit einem macOS-Installer von rund 20 MB. Fertige Versionen erscheinen für macOS mit Apple Silicon; Windows, Linux und Intel-Macs werden aus dem Quellcode erstellt. Native Menüs, Offlinebetrieb und automatisches Speichern.

**Web:** läuft im Browser aus einem eigenen Build (`bun run dev` oder eine selbst gehostete Bereitstellung) oder von einem Pairdraw-Cloud-Server; eine gehostete Version gibt es nicht. Auf Mobilgeräten als PWA installierbar, mit für Touch optimierter Oberfläche.

**VS Code:** Ein eigener Editor für `.fig`- und `.pen`-Dokumente, der den Web-Editor in einer Webview ausführt und speichert, was dieser zeigt. Er ist in keinem Marktplatz veröffentlicht und wird deshalb aus dem Repository gebaut ([VS Code-Erweiterung](/programmable/vscode)).

## Plugins

Unter **Einstellungen → App → Erweiterungen** lassen sich Plugin-Manifeste installieren, und der Befehl eines Plugins läuft aus der Befehlspalette auf dem geöffneten Dokument, nachdem es gefragt hat, was es darf. Es läuft immer nur ein Plugin; Netzwerkzugriff wird abgelehnt ([Plugins](/user-guide/plugins)).

## Ersatzweise Google Fonts laden

Ist eine Schrift nicht lokal verfügbar, lädt Pairdraw sie automatisch von Google Fonts. Beim Öffnen von `.fig`-Dateien mit unbekannten Schriften ist keine manuelle Installation nötig.
