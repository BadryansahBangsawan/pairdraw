---
title: Export
description: Bilder, SVG und Teilmengen als `.fig` exportieren sowie `.fig`- und `.pen`-Dokumente in Pairdraw öffnen.
---

# Export

Exportieren Sie einzelne Objekte als Bilder oder als `.fig`-Teilmengen und öffnen Sie vollständige `.fig`- oder `.pen`-Dokumente.

## Bilder exportieren

Wählen Sie ein Objekt aus und verwenden Sie den Bereich „Export“ im Eigenschaften-Panel.

### Exporteinstellungen

- **Maßstab:** 0,5×, 0,75×, 1×, 1,5×, 2×, 3× oder 4× (bei SVG ausgeblendet, da Vektoren auflösungsunabhängig sind).
- **Format:** PNG (transparenter Hintergrund), JPG (weißer Hintergrund), WEBP (transparenter Hintergrund), SVG (Vektor), PDF oder HTML.

**Datei → Auswahl exportieren** exportiert die Auswahl als PNG, SVG oder `.fig`, und <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> exportiert sie sofort als PNG.

Die App bietet keinen Export als PowerPoint (`.pptx`) oder draw.io. Die [CLI](/reference/cli#export) exportiert beides weiterhin: `pairdraw export design.fig -f pptx` oder `-f drawio`.

Sie können mehrere Exporteinstellungen hinzufügen, um dasselbe Objekt in einem Durchgang in verschiedenen Maßstäben oder Formaten zu exportieren. Eine Live-Vorschau auf einem Schachbrettmuster zeigt, was exportiert wird.

### Exportwege

| Weg | macOS | Windows / Linux |
|--------|-----|-----------------|
| Tastenkürzel (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>E</kbd> |
| Kontextmenü | Rechtsklick <kbd>→</kbd> Export… | Rechtsklick <kbd>→</kbd> Export… |
| Eigenschaften-Panel | Schaltfläche „Export“ anklicken | Schaltfläche „Export“ anklicken |

Die exportierte Datei wird über einen nativen Dialog (Desktop) oder als Browser-Download gespeichert.

## HTML, PDF und Qualität

- **JPG- und WEBP-Zeilen** haben ein Qualitätsfeld von 1 bis 100 (ohne Angabe 90), das mit der Ebene gespeichert wird.
- **PDF** mit mehreren ausgewählten Ebenen ergibt ein PDF mit einer Seite pro Ebene in der Reihenfolge der Auswahl, jede so groß wie ihre Ebene.
- **Datei › Rahmen als PDF exportieren…** speichert die Rahmen der Seite als ein PDF mit einer Seite pro Rahmen in Ebenenreihenfolge, jede so groß wie ihr Rahmen. Rahmen in Sektionen zählen mit, lose Formen, Texte und Gruppen nicht. Sind Ebenen ausgewählt, werden nur diese exportiert.
- **HTML** schreibt die Ebene als Webseite. Die Optionsschaltfläche neben dem Format legt fest, ob das HTML-Grundgerüst enthalten ist (eine ganze Seite oder ein Fragment zum Einfügen), ob mit CSS oder Tailwind gestaltet wird, ob Bilder eingebettet oder als separate Dateien (zusammen in einer `.zip`) gespeichert werden und ob Ebenennamen (`data-name`, standardmäßig an) und Ebenen-IDs (`data-pairdraw-node-id`, standardmäßig aus) als Attribute geschrieben werden. Die HTML-Ansicht des Code-Panels exportiert genauso, mit dem dort gezeigten Styling.
- Im Code-Panel können Vue- und React-Komponenten Icons aus Lucide, Heroicons oder Font Awesome statt aus Iconify beziehen, React-Komponenten auch aus React Icons; ein Icon, das das Paket nicht hat, bleibt bei Iconify.

## Kopieren/Einfügen als

Neben dem Export als Datei können Sie die Auswahl über das Kontextmenü (Rechtsklick → **Kopieren/Einfügen als**) in mehreren Formaten in die Zwischenablage kopieren:

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Als Text kopieren | — | — |
| Als SVG kopieren | — | — |
| Als PNG kopieren | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>C</kbd> |
| Als JSX kopieren | — | — |

- **Als Text kopieren:** kopiert den sichtbaren Textinhalt der Auswahl.
- **Als SVG kopieren:** kopiert die Auswahl als SVG-Markup (zum Einfügen in Code-Editoren, Inkscape usw.).
- **Als PNG kopieren:** rendert im Maßstab 2× und kopiert in die Zwischenablage (bereit zum Einfügen in Slack, Notion usw.).
- **Als JSX kopieren:** kopiert die Pairdraw-JSX-Darstellung (kompatibel mit `renderJsx()`).

## `.fig`-Dateien

Pairdraw verwendet für vollständige Dokumente das `.fig`-Format, dasselbe Binärformat wie Figma.

### Dateien öffnen

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Datei öffnen | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Strg</kbd> + <kbd>O</kbd> |

Ein Dateiauswahldialog öffnet sich, gefiltert auf `.fig`- und `.pen`-Dateien. In der Desktop-App ist das der native Dialog des Betriebssystems.

Sie können auch eine `.fig`-, `.pen`- oder andere unterstützte Dokumentdatei auf das Fenster ziehen; sie öffnet sich in einem neuen Tab. Auf die Arbeitsfläche gezogene Bilder und SVG-Dateien werden stattdessen im Dokument platziert, und jede andere Datei meldet, dass sie sich nicht öffnen lässt.

Ein `.pen`-Dokument, das `.pen`-Bibliotheken importiert, öffnet sich mit den verwendeten Bibliothekskomponenten, gelesen aus den Dateien, die es relativ zu sich selbst nennt. Im Dokument sind sie schreibgeschützte Bibliothekskomponenten; ändern Sie sie in der Bibliothek. Ein Browser kann keine Dateien neben einem Dokument lesen, daher erscheinen diese Komponenten dort als gestrichelte Platzhalter, und eine Meldung nennt die Bibliotheken; öffnen Sie die Datei in der Desktop-App oder mit der CLI, um sie zu laden. Die Desktop-App liest Bibliotheken bis zu zwei Ordner oberhalb des Dokuments, aber nie aus Ihrem Benutzerordner oder darüber und nicht über Verknüpfungen; eine auf das Fenster gezogene Datei liest keine, öffnen Sie sie daher mit **Datei > Öffnen…**. Die CLI liest Bibliotheken innerhalb des Arbeitsverzeichnisses. Skript- und Browser-Objekte, die Pairdraw nicht ausführt, öffnen sich ebenfalls als Platzhalter, die ihre Skriptdatei oder Seitenadresse behalten.

### Dateien speichern

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Speichern | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Strg</kbd> + <kbd>S</kbd> |
| Speichern unter | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>S</kbd> |

- **Speichern** überschreibt die geöffnete Datei ohne Dialog.
- **Speichern unter** öffnet einen Speicherdialog zur Wahl eines neuen Speicherorts.

Gespeicherte Dateien sind komprimiert und enthalten ein Vorschaubild für Dateibrowser. Chrome und Edge verwenden nach Möglichkeit die File System Access API; andere Browser, darunter Safari, laden die Datei herunter.

Ist nichts ausgewählt, legt der Bereich **Dokument** im Design-Panel fest, wie stark das Dokument komprimiert wird. **Schnell** entspricht Figmas eigenem Speichern. **Kleiner** und **Am kleinsten** verkleinern die Datei und brauchen länger zum Speichern; das macht sich bei großen Dokumenten am stärksten bemerkbar und bei Dateien, die überwiegend aus Bildern bestehen, am wenigsten. Die Wahl wird in der Datei gespeichert, und Figma öffnet alle drei.

### Kompatibilität in beide Richtungen

Aus Pairdraw exportierte Dateien lassen sich in Figma öffnen und umgekehrt. Das `.fig`-Format bewahrt alle Objekttypen, Eigenschaften, Füllungen, Konturen, Effekte, Vektordaten und Layouteinstellungen.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-----|-----------------|
| Auswahl als PNG exportieren | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>E</kbd> |
| Als PNG kopieren | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>C</kbd> |
| Datei öffnen | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Strg</kbd> + <kbd>O</kbd> |
| Speichern | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Strg</kbd> + <kbd>S</kbd> |
| Speichern unter | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>S</kbd> |

## Tipps

- Für hochauflösende Bildschirme exportieren Sie im Maßstab 2× oder 3×.
- JPG verwendet immer einen weißen Hintergrund; für Transparenz nehmen Sie PNG oder WEBP.
- Den SVG-Export nutzen Sie, wenn Sie ein Vektorformat zur Weiterbearbeitung in Illustrator, Inkscape oder Code brauchen.
- Das Vorschaubild in exportierten `.fig`-Dateien ermöglicht die Vorschau in Dateibrowsern und in Figmas Dateiauswahl.
