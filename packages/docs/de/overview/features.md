# Funktionen

## Figma-Dateien

Pairdraw öffnet und speichert `.fig`-Dateien direkt. Import und Export verwenden wie Figma den Kiwi-Binärcodec mit 194 Schemadefinitionen und rund 390 Feldern pro Objekt. Speichern: <kbd>⌘</kbd><kbd>S</kbd>, Speichern unter: <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Kopieren und Einfügen mit Figma:** Objekte in Figma auswählen, <kbd>⌘</kbd><kbd>C</kbd> drücken, zu Pairdraw wechseln und mit <kbd>⌘</kbd><kbd>V</kbd> einfügen. Füllungen, Konturen, automatische Anordnung, Text, Effekte, Eckenradien und Vektornetzwerke bleiben in beiden Richtungen erhalten.

## Zeichnen und Bearbeiten

- **Formen:** Rechteck (<kbd>R</kbd>), Ellipse (<kbd>O</kbd>), Linie (<kbd>L</kbd>), Polygon und Stern.
- **Zeichenstift:** Vektornetzwerke statt einfacher Pfade, Bézierkurven mit Tangentengriffen.
- **Text:** Bearbeitung direkt auf der Arbeitsfläche, IME-Unterstützung und Doppelklick zum Wechsel in den Bearbeitungsmodus.
- **Formatierter Text:** Fett, Kursiv, Unterstrichen und Durchgestrichen für einzelne Zeichenbereiche.
- **Automatische Anordnung:** Flexbox und CSS Grid über Yoga WASM mit Richtung, Abstand, Innenabstand, Verteilung, Ausrichtung, Größenmodi und Rasterspuren.
- **Komponenten:** Komponenten und Komponentensätze, Instanzen mit Überschreibungen und automatische Synchronisierung.
- **Skript-Ebenen:** Der Inhalt einer Ebene wird von einem im Dokument gespeicherten JavaScript-Programm gezeichnet. `@input`-Steuerelemente lassen sich an Variablen binden; Änderungen am Code, an den Eingaben oder an der Größe lösen einen neuen Lauf aus, und das Ergebnis lässt sich mit einem Schritt in gewöhnliche Ebenen umwandeln ([Skript-Ebenen](/user-guide/script-layers)).
- **Prototypen:** Klick- oder Verzögerungsinteraktionen führen zu einem Frame, öffnen oder schließen eine Überlagerung oder gehen zurück; abspielbar auf der Arbeitsfläche mit sofortigem oder aufgelöstem Übergang ([Prototyp abspielen](/user-guide/playing-a-prototype)).
- **Variablen:** Designtoken mit Sammlungen, Modi wie Hell und Dunkel, den Typen Color, Float, String und Boolean sowie Variablenbindungen.
- **Sektionen:** Container zur Organisation mit automatischer Übernahme überlappender Objekte.

## Eigenschaften

Die Registerkarten Design, Code und Prüfen passen sich der aktuellen Auswahl an; der AI-Chat hat eine eigene Spalte:

- **Darstellung:** Deckkraft, einheitlicher oder separater Eckenradius und Sichtbarkeit.
- **Füllung:** Volltonfarbe, lineare, radiale, Winkel- und Diamantverläufe sowie Bilder.
- **Kontur:** Farbe, Stärke, Ausrichtung, separate Stärke pro Seite, Enden, Verbindungen und Strichelung.
- **Effekte:** Schlagschatten, innerer Schatten sowie Ebenen-, Hintergrund- und Vordergrundunschärfe.
- **Typografie:** Schriftwahl mit Suche und virtuellem Scrollen, Schnitt, Größe, Ausrichtung und Formatierung.
- **Anordnung:** Einstellungen der automatischen Anordnung.
- **Export:** Maßstab, PNG/JPG/WEBP/SVG und Vorschau.
- **Code:** Design JSX und Tailwind JSX für die Auswahl, mit Design JSX live in beide Richtungen bearbeitbar: Der Code wird angepasst, wenn sich Ebenen ändern. Das Element an der Cursorposition umrandet seine Ebene auf der Arbeitsfläche, und Designprobleme werden an der Eigenschaft unterstrichen, die sie verursacht.
- **Prüfen:** Live-Designprüfung für die Seite oder die Auswahl: geringer Kontrast, kleine Touch-Ziele, nicht gebundene Farben, Abstände außerhalb der Skala, geprüft, solange die Registerkarte offen ist, mit Variablenbindung per Klick ([Designs prüfen](/user-guide/checking-designs)).

## Darstellung

Skia über CanvasKit WASM ist dieselbe Grafik-Engine, die auch Figma verwendet. Pairdraw unterstützt unter anderem:

- lineare, radiale, Winkel- und Diamantverläufe;
- Bildfüllungen mit verschiedenen Skalierungsarten;
- Zwischenspeicherung von Effekten pro Objekt;
- Bögen, partielle Ellipsen und Ringe;
- Auslassen nicht sichtbarer Objekte und Wiederverwenden von Zeichenwerkzeugen;
- Fanglinien mit Berücksichtigung der Drehung;
- Lineale mit Markierung des Auswahlbereichs;
- Hervorhebung entlang der tatsächlichen Geometrie.

## Rückgängig und Wiederholen

Erstellen, Löschen, Verschieben, Größenänderung, Eigenschaftsänderungen, Wechsel des übergeordneten Objekts, Anordnung und Variablen lassen sich rückgängig machen. Tastenkürzel: <kbd>⌘</kbd><kbd>Z</kbd> und <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Seiten und Dokumente

Seiten können hinzugefügt, gelöscht und umbenannt werden und behalten jeweils ihre eigene Ansichtsposition und Vergrößerung. Mehrere Dokumente lassen sich in Registerkarten öffnen.

## Export

- **Bilder:** PNG, JPG und WEBP im Maßstab 0,5× bis 4×.
- **SVG:** Formen, Text mit Stilbereichen, Verläufe, Effekte und Mischmodi.
- **Tailwind JSX:** HTML mit Tailwind-v4-Klassen für React oder Vue.
- **Kopieren als:** Text, SVG, PNG oder JSX über das Kontextmenü.

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## AI-Chat

<kbd>⌘</kbd><kbd>J</kbd> öffnet den Assistenten. Mehr als 90 Werkzeuge erstellen Formen, ändern Stile und Anordnungen, bearbeiten Komponenten und Variablen, führen boolesche Operationen aus, analysieren Designtoken und exportieren Ressourcen. Unterstützt werden Anthropic, OpenAI, Google AI, OpenRouter und kompatible Endpunkte.

Werkzeugaufrufe erscheinen als einklappbare Einträge auf einer Zeitleiste. Zur visuellen Prüfung stellt der Assistent seine Änderungen dar und vergleicht das Ergebnis mit der Anfrage. Sämtliche Änderungen durch AI können rückgängig gemacht werden.

Sie können einem Agenten beim Zeichnen zusehen: Jede Ebene, die er hinzufügt, zeichnet sich nacheinander ein, die Rahmen, in denen er arbeitet, schimmern, und sobald er fertig ist, zählt ein Hinweis, was er hinzugefügt und geändert hat. **KI-Änderungen animieren** in den Einstellungen schaltet das aus ([Watching the assistant draw](/programmable/ai-chat#watching-the-assistant-draw)).

## Integrierter Browser

`http`- und `https`-Seiten öffnen sich in einem eigenen Fenster der Desktop-App, das nichts mit dem Editor teilt, und lassen sich auf die Arbeitsfläche holen: die ganze Seite oder ein ausgewähltes Element als Ebenen importieren oder einen Screenshot der Ansicht, der Seite oder eines Elements ablegen. Der Chat kann die Seite lesen, ein Element in der Antwort markieren und darauf klicken, tippen, eine Taste drücken, scrollen oder warten; gefragt wird vorher, wenn die Einstellungen vor Änderungen fragen.

In einem vorhandenen Board wird derselbe Browser zur Recherche (neue Boards bietet Pairdraw nicht an): Der Chat zitiert die Seite in eine Haftnotiz mit Adresse, Titel, Zitat und Lesezeit ([Recherche auf einem Board](/user-guide/research)).

## MCP-Server

Claude Code, Cursor, Windsurf und andere MCP-Clients können `.fig`-Dateien mit mehr als 90 Werkzeugen ohne grafische Oberfläche lesen und verändern. Als Übertragung stehen stdio und HTTP zur Verfügung.

```sh
npm install -g @pairdraw/mcp
```

## CLI

`.fig`-Dateien lassen sich im Terminal untersuchen, exportieren und analysieren:

```sh
pairdraw tree design.fig              # Objektbaum
pairdraw find design.fig --type TEXT  # Suche
pairdraw export design.fig -f png     # Export
pairdraw analyze colors design.fig    # Farbanalyse
pairdraw analyze clusters design.fig  # Wiederkehrende Strukturen
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Alle Befehle unterstützen `--json`. Installation: `npm install -g @pairdraw/cli` oder `bun add -g @pairdraw/cli`.

## Zusammenarbeit

KI-Agenten zeigen ihre Zeiger und die Ebenen, die sie bearbeiten, auf der Arbeitsfläche, und die Ansicht folgt ihnen, während sie arbeiten. Cloud-Dokumente bearbeiten mehrere Personen gemeinsam über einen selbst gehosteten [Pairdraw-Cloud](/user-guide/pairdraw-cloud)-Server, mit Zeigern, Anwesenheitsanzeigen und dem Folgen der Ansicht einer Person. Live-Räume für lokale Dokumente, der Beitritt per Link und Sprachanrufe gehören nicht zu Pairdraw ([Zusammenarbeit](/de/programmable/collaboration)).

## Desktop und Web

**Desktop:** Tauri v2, Installer rund 20 MB unter macOS; fertige Versionen erscheinen für macOS mit Apple Silicon, Windows, Linux und Intel-Macs werden aus dem Quellcode erstellt, mit nativen Menüs, Offlinebetrieb und automatischem Speichern.

**Web:** im Browser aus einem eigenen Build oder von einem Pairdraw-Cloud-Server, als PWA installierbar und für Touch-Bedienung optimiert.

**VS Code:** Ein eigener Editor für `.fig`- und `.pen`-Dokumente, der den Web-Editor in einer Webview ausführt und speichert, was dieser zeigt. Er ist in keinem Marktplatz veröffentlicht und wird deshalb aus dem Repository gebaut ([VS Code-Erweiterung](/programmable/vscode)).

## Plugins

Unter **Einstellungen → App → Erweiterungen** lassen sich Plugin-Manifeste installieren, und der Befehl eines Plugins läuft aus der Befehlspalette auf dem geöffneten Dokument, nachdem es gefragt hat, was es darf. Es läuft immer nur ein Plugin; Netzwerkzugriff wird abgelehnt ([Plugins](/user-guide/plugins)).

## Ersatzweise Google Fonts laden

Ist eine Schrift nicht lokal verfügbar, lädt Pairdraw sie automatisch von Google Fonts. Eine manuelle Installation ist nicht erforderlich.
