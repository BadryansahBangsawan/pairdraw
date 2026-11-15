---
title: Kontextmenü
description: Aktionen des Kontextmenüs in Pairdraw — Zwischenablage, Reihenfolge, Gruppen, Komponenten und mehr.
---

# Kontextmenü

Ein Rechtsklick auf die Arbeitsfläche öffnet das Kontextmenü. Klicken Sie mit der rechten Maustaste auf ein Objekt, wird es zuerst ausgewählt; ein Rechtsklick auf eine freie Stelle hebt die Auswahl auf.

## Kopieren/Einfügen als

Das Untermenü **Kopieren/Einfügen als** bietet weitere Formate für die Zwischenablage:

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Als Text kopieren | — | — |
| Als SVG kopieren | — | — |
| Als PNG kopieren | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>C</kbd> |
| Als JSX kopieren | — | — |
| Als HTML kopieren | — | — |

- **Als Text kopieren:** kopiert den sichtbaren Textinhalt der Auswahl.
- **Als SVG kopieren:** kopiert den Objektbaum als SVG-Markup.
- **Als PNG kopieren:** rendert im Maßstab 2× und legt das Bild in die Zwischenablage des Systems (zum Einfügen in Slack, Notion usw.).
- **Als JSX kopieren:** kopiert die Pairdraw-JSX-Darstellung zur Verwendung mit `renderJsx()`.
- **Als HTML kopieren:** kopiert ein HTML-Fragment mit Inline-Stilen und eingebetteten Bildern, bereit zum Einfügen in eine Seite oder E-Mail; das funktioniert auch in schreibgeschützten Dokumenten.

## Haftnotiz als Prompt ausführen

Sind nur Haftnotizen ausgewählt und hat mindestens eine davon Text, schickt **Haftnotiz als Prompt ausführen** ihren Text an den [AI-Chat](/de/programmable/ai-chat) des Dokuments, mit einem Verweis auf jede Notiz, damit der Assistent weiß, woher der Text stammt. Die Aktion erscheint nur in Dokumenten, die Sie bearbeiten dürfen. Ist noch kein Modell eingerichtet, sucht Pairdraw zuerst nach einem Coding-Agenten auf Ihrem Computer, öffnet die geführte Einrichtung, wenn keiner gefunden wird, und schickt dann den Prompt.

## Zwischenablage

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Kopieren | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Strg</kbd> + <kbd>C</kbd> |
| Ausschneiden | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Strg</kbd> + <kbd>X</kbd> |
| Hier einfügen | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Strg</kbd> + <kbd>V</kbd> |
| Duplizieren | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Strg</kbd> + <kbd>D</kbd> |
| Löschen | <kbd>⌫</kbd> | <kbd>Backspace</kbd> / <kbd>Entf</kbd> |

Ist nichts ausgewählt, sind die Aktionen der Zwischenablage deaktiviert (außer Einfügen, das verfügbar ist, wenn die Zwischenablage Inhalt hat).

## Eigenschaften kopieren und einfügen

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Eigenschaften kopieren | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>Strg</kbd> + <kbd>C</kbd> |
| Eigenschaften einfügen | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> | <kbd>Alt</kbd> + <kbd>Strg</kbd> + <kbd>V</kbd> |

Beide stehen im Untermenü **Kopieren/Einfügen als**.

- **Eigenschaften kopieren** legt die ausgewählte Ebene wie Figma in die Zwischenablage des Systems, so markiert, dass ein gewöhnliches Einfügen sie ignoriert.
- **Eigenschaften einfügen** überträgt das Aussehen der einen Ebene in der Zwischenablage auf jede ausgewählte Ebene, auch gesperrte, in einem einzigen Rückgängig-Schritt. Gelesen wird eine Kopie aus „Eigenschaften kopieren“ oder aus einem gewöhnlichen Kopieren, hier oder in Figma.
- Zum Aussehen gehören Füllungen, Konturen, Effekte, Deckkraft, Mischmodus, Eckenradius sowie verknüpfte Stile und Variablen. Zwischen Rahmen gehören Auto-Layout und Layout-Raster dazu, zwischen Textebenen der Textstil. Position, Größe, Drehung, Name und Inhalt ändern sich nie, und Eigenschaften, die in einer Textebene von Zeichen zu Zeichen wechseln, bleiben unberührt.

## Reihenfolge

| Aktion | Kürzel |
|--------|----------|
| In den Vordergrund | <kbd>]</kbd> |
| In den Hintergrund | <kbd>[</kbd> |

Verschiebt das ausgewählte Objekt an den Anfang oder das Ende der Kinderliste seines übergeordneten Objekts.

## Gruppieren

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Gruppieren | <kbd>⌘</kbd><kbd>G</kbd> | <kbd>Strg</kbd> + <kbd>G</kbd> |
| Gruppierung aufheben | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>G</kbd> |
| Auto-Layout hinzufügen | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

- **Gruppieren** setzt mindestens zwei ausgewählte Objekte voraus.
- **Gruppierung aufheben** erscheint, wenn eine Gruppe ausgewählt ist; die Kinder wandern zum übergeordneten Objekt der Gruppe.
- **Auto-Layout hinzufügen** schließt die Auswahl in einen neuen [Auto-Layout](./auto-layout)-Rahmen ein.

## Komponentenaktionen

Komponentenaktionen erscheinen passend zur Farbe der Komponenten in Violett.

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) | Verfügbar für |
|--------|----------------|----------------------|--------------|
| Komponente erstellen | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> | Jede Auswahl |
| Komponentensatz erstellen | — | — | Mindestens zwei ausgewählte Komponenten |
| Instanz erstellen | — | — | Komponenten (kein Kürzel) |
| Zur Hauptkomponente | — | — | Instanzen |
| Instanz lösen | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> | Instanzen |

Den Arbeitsablauf mit Komponenten beschreibt [Komponenten](./components).

## Sichtbarkeit und Sperre

| Aktion | Kürzel (Mac) | Kürzel (Win/Linux) |
|--------|----------------|----------------------|
| Ausblenden / Einblenden | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>H</kbd> |
| Sperren / Entsperren | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>L</kbd> |

Die Beschriftung richtet sich nach dem aktuellen Zustand des Objekts (zum Beispiel „Ausblenden“ für ein sichtbares, „Einblenden“ für ein ausgeblendetes Objekt).

## Auf Seite verschieben

Das Untermenü **Auf Seite verschieben** listet alle Seiten außer der aktuellen. Wählen Sie eine Seite, um die ausgewählten Objekte auf die Arbeitsfläche dieser Seite zu verschieben.

## Tipps

- Ein Rechtsklick auf eine freie Stelle bietet „Hier einfügen“, praktisch, um Inhalte an einer bestimmten Stelle abzulegen.
- Komponentenaktionen erscheinen nur, wenn sie passen (zum Beispiel „Instanz erstellen“ nur für Komponenten).
- Das Kontextmenü spiegelt die Tastenkürzel wider; so entdecken Sie Kürzel, die Sie noch nicht kennen.
