---
title: Export
description: Auswahl als PNG, JPG, WEBP oder SVG exportieren und `.fig`-Dateien öffnen und speichern.
---

# Export

Pairdraw exportiert einzelne Objekte als Bilder oder SVG und speichert vollständige Dokumente als `.fig`.

## Bilder und SVG

Wählen Sie ein Objekt und öffnen Sie im Eigenschaften-Panel den Bereich Export.

- **Maßstab:** 0,5× bis 4×; bei SVG ausgeblendet.
- **Format:** PNG und WEBP mit transparentem Hintergrund, JPG mit weißem Hintergrund, SVG, PDF, HTML, PPTX (PowerPoint) oder draw.io.
- Mehrere Exporteinstellungen pro Objekt sind möglich.
- Eine Vorschau zeigt das Ergebnis auf einem Schachbrettmuster.

## HTML, PDF und Qualität

- **JPG- und WEBP-Zeilen** haben ein Qualitätsfeld von 1 bis 100 (ohne Angabe 90), das mit der Ebene gespeichert wird.
- **PDF** mit mehreren ausgewählten Ebenen ergibt ein PDF mit einer Seite pro Ebene in der Reihenfolge der Auswahl, jede so groß wie ihre Ebene.
- **Datei › Rahmen als PDF exportieren…** speichert die Rahmen der Seite als ein PDF mit einer Seite pro Rahmen in Ebenenreihenfolge, jede so groß wie ihr Rahmen. Rahmen in Sektionen zählen mit, lose Formen, Texte und Gruppen nicht. Sind Ebenen ausgewählt, werden nur diese exportiert.
- **HTML** schreibt die Ebene als Webseite. Die Optionsschaltfläche neben dem Format legt fest, ob das HTML-Grundgerüst enthalten ist (eine ganze Seite oder ein Fragment zum Einfügen), ob mit CSS oder Tailwind gestaltet wird, ob Bilder eingebettet oder als separate Dateien (zusammen in einer `.zip`) gespeichert werden und ob Ebenennamen (`data-name`, standardmäßig an) und Ebenen-IDs (`data-pairdraw-node-id`, standardmäßig aus) als Attribute geschrieben werden. Die HTML-Ansicht des Code-Panels exportiert genauso, mit dem dort gezeigten Styling.
- Im Code-Panel können Vue- und React-Komponenten Icons aus Lucide, Heroicons oder Font Awesome statt aus Iconify beziehen, React-Komponenten auch aus React Icons; ein Icon, das das Paket nicht hat, bleibt bei Iconify.

## Kopieren als

Das Kontextmenü kopiert die Auswahl als Text, SVG, PNG oder JSX.

## `.fig`-Dateien

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Öffnen | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Strg</kbd><kbd>O</kbd> |
| Speichern | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Strg</kbd><kbd>S</kbd> |
| Speichern unter | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd><kbd>Strg</kbd><kbd>S</kbd> |

Chrome und Edge verwenden nach Möglichkeit die File System Access API. Andere Browser, darunter Safari, laden die Datei herunter.

Exportierte `.fig`-Dateien können in Pairdraw und Figma geöffnet werden.
