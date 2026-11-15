---
title: Ebenen und Seiten
description: Ebenen, Seiten und das Eigenschaften-Panel in Pairdraw verwalten.
---

# Ebenen und Seiten

Der Editor öffnet nur mit der Arbeitsfläche. Die Werkzeuge stehen am linken Rand der Arbeitsfläche, darüber der Schalter für das Ebenen-Panel, und der Zoom sitzt unten rechts. Das Ebenen-Panel öffnet sich links, das Eigenschaften-Panel rechts und der AI-Chat in einer Spalte daneben; alle lassen sich an ihren Rändern in der Breite ziehen. Wann welches Panel erscheint, beschreibt [Seitenleisten](./canvas-navigation#side-panels).

Solange der AI-Chat geschlossen ist, schickt ein Prompt unten auf der Arbeitsfläche das Geschriebene an den Chat; **Prompt auf der Arbeitsfläche** unter **Einstellungen → Modelle → Chat** schaltet ihn aus. <kbd>Escape</kbd> im Prompt kehrt zur Arbeitsfläche zurück.

## Ebenen-Panel

Das Ebenen-Panel links zeigt die Dokumenthierarchie als Baum.

### Baumansicht

Objekte erscheinen in einem aufklappbaren Baum. Klicken Sie auf den Pfeil neben einem Rahmen, einer Gruppe oder einer Komponente, um ihre Kinder auf- oder zuzuklappen.

### Per Ziehen umordnen

Ziehen Sie Ebenen, um sie umzuordnen oder in einen anderen Container zu verschieben. Weiter oben stehende Objekte werden darüber gezeichnet.

### Sichtbarkeit

Klicken Sie auf das Augensymbol neben einer Ebene, um sie auf der Arbeitsfläche aus- oder einzublenden. Ausgeblendete Objekte bleiben im Baum.

### Umbenennen

Doppelklicken Sie auf einen Ebenennamen, um ihn direkt umzubenennen. <kbd>Enter</kbd> oder ein Klick daneben übernimmt den Namen, <kbd>Escape</kbd> bricht ab.

### Auswahl abgleichen

Ein Klick auf eine Ebene im Panel wählt das zugehörige Objekt auf der Arbeitsfläche aus und umgekehrt.

### Ebenen suchen {#find-layers}

Drücken Sie <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Strg</kbd> + <kbd>F</kbd>), wählen Sie **Bearbeiten → Ebenen suchen…** oder starten Sie die Suche aus der Befehlspalette, um die Ebenen der angezeigten Seite nach Namen zu durchsuchen. Ein gewählter Treffer wird ausgewählt und in die Ansicht geholt.

## Seiten-Panel

Das Seiten-Panel zeigt alle Seiten des Dokuments.

- **Seite wechseln:** Klicken Sie auf eine Seite, um sie zu aktivieren. Die Arbeitsfläche wechselt auf diese Seite und stellt ihre Ansichtsposition wieder her.
- **Seite hinzufügen:** Die Schaltfläche zum Hinzufügen erstellt eine neue Seite.
- **Seite löschen:** entfernt die aktuelle Seite.
- **Seite umbenennen:** Doppelklicken Sie auf den Seitennamen, um ihn direkt zu bearbeiten. <kbd>Enter</kbd>, <kbd>Escape</kbd> oder ein Klick daneben übernimmt den neuen Namen.

Jede Seite hat ihre eigene Arbeitsfläche mit eigenem Hintergrund sowie eine eigene Ansichtsposition und Vergrößerung.

## Folien-Panel

Das Folien-Panel listet die Rahmen der obersten Ebene der Seite als nummerierte Folienminiaturen in Ebenenreihenfolge. Ein Klick auf eine Folie zeigt ihren Rahmen auf der Arbeitsfläche; ziehen Sie eine Folie — oder drücken Sie <kbd>Alt</kbd> mit Pfeil nach oben oder unten —, um sie umzuordnen. **Folien als PDF exportieren** schreibt alle Folien in dieser Reihenfolge in eine PDF-Datei.

## Präsentieren

Präsentieren zeigt die Folien der Seite im Vollbild an, immer eine gleichzeitig. Starten Sie es mit <kbd>⌘</kbd>/<kbd>Strg</kbd> + <kbd>Enter</kbd>, über **Ansicht → Präsentieren** oder die Schaltfläche „Präsentieren“ in der oberen Leiste. Die Pfeiltasten, <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>Bild auf</kbd>/<kbd>Bild ab</kbd> und das Mausrad blättern durch die Folien; <kbd>Escape</kbd> verlässt die Präsentation und gibt die Arbeitsfläche und den Tastaturfokus dorthin zurück, wo sie waren. Eine Folie, die höher als der Bildschirm ist, wird bei 100 % gezeigt und kann gescrollt werden.

## Dokumente und Wiederherstellung

Die **Startseite** beginnt mit einem Prompt: Wählen Sie darüber, was entstehen soll (Landingpage, Mobile App, Web-App, Folien, Dashboard oder etwas anderes), beschreiben Sie es, und Pairdraw öffnet ein neues Design und schickt den Prompt mit einer Anleitung für diese Art an dessen AI-Chat; Beispiel-Prompts darunter füllen den Prompt mit einer Idee, die Sie anpassen können. Unter dem Prompt können Sie mit einer Figma-Datei, einer Seite im integrierten Browser (Desktop-App) oder einem Screenshot beginnen, den der Agent nachbaut. Registerkarten wechseln zwischen **Zuletzt verwendet**, **Entwürfe** und **Designsysteme**, und das Menü daneben listet die Orte, die Ihr Cloud-Server und Ihr Speicher-Bucket hinzufügen. Ein Suchfeld filtert die Liste, **Öffnen…** öffnet eine Datei, und **Design** beginnt ein leeres Design.

**Zuletzt verwendet** listet aktuelle lokale Dokumente. Verwenden Sie die Raster- oder Listenansicht und sortieren Sie aktuelle Dateien nach **Name**, **Zuletzt verwendet** oder **Erstellt**. <kbd>⌘</kbd>/<kbd>Strg</kbd>-Klick fügt eine Datei zur Auswahl hinzu, <kbd>Shift</kbd>-Klick wählt einen Bereich aus, und <kbd>⌘</kbd>/<kbd>Strg</kbd>+<kbd>A</kbd> wählt alle gelisteten Dateien; die Auswahlleiste öffnet sie dann in separaten Editor-Tabs, entfernt sie aus „Zuletzt verwendet“ oder löscht gespeicherte Dokumente. Das <kbd>⋯</kbd>-Menü einer Datei oder ihr Rechtsklick-Menü bietet **Aus „Zuletzt verwendet“ entfernen**, das die Datei vergisst, ohne sie zu löschen, und **Speichern unter…**, das eine Kopie an anderer Stelle speichert. **Designsysteme** listet wie die Extras das mitgelieferte Pairdraw Basics und die Komponentenbibliotheken, die Sie veröffentlicht haben; wählen Sie eine aus, öffnet sich ein neues Design mit dieser Bibliothek im Elemente-Panel aktiviert.

Ein neues Design bleibt während der Arbeit als Entwurf auf diesem Gerät: Jede Änderung wird kurz nach dem Machen geschrieben, das Schließen seines Tabs fragt also nichts. **Entwürfe** auf der Startseite listet sie mit einer Vorschau; öffnen Sie einen, um weiterzuarbeiten, oder wählen Sie **Entwurf löschen** aus seinem <kbd>⋯</kbd>- oder Rechtsklick-Menü, um ihn endgültig zu entfernen. Speichern Sie einen Entwurf in eine Datei oder einen Speicher, im Editor oder mit **Speichern unter…** auf der Startseite, verlässt er die Entwürfe. Entwürfe leben nur in diesem Browser-Profil bzw. dieser Desktop-Installation und setzen voraus, dass **Ungespeicherte Arbeit automatisch sichern** eingeschaltet ist und der Browser Websitedaten behält.

Unter **Einstellungen → Allgemein → Wiederherstellung** steuert **Ungespeicherte Arbeit automatisch sichern** Entwürfe und lokale Wiederherstellungskopien. Ist die Wiederherstellung aktiviert, bleiben nicht gespeicherte Dokumente ohne Dateipfad wiederherstellbar, auch nachdem ihre Tabs geschlossen wurden. Bietet Pairdraw **Nicht gespeicherte Arbeit wiederherstellen** an, wählen Sie **Wiederherstellen**, um ein Dokument erneut zu öffnen, oder **Verwerfen**, um seine Wiederherstellungskopie zu entfernen.

Eine geöffnete Datei behält auch ein Backup von Änderungen, die noch nicht in ihr gespeichert wurden — geschrieben, solange Autosave aus ist, oder wenn das Fenster schließt, bevor Autosave sie geschrieben hat. Öffnet sich die Datei das nächste Mal, bietet **Wiederhergestellte Änderungen** **Speichern** an, um sie in die Datei zu schreiben, **Speichern unter…**, um sie getrennt zu öffnen und als neue Datei zu speichern, oder **Nicht speichern**, um die Datei unverändert zu lassen und das Backup zu verwerfen. Schließen des Dialogs behält das Backup für das nächste Mal. Speichern Sie die Datei, fallen ihre älteren Backups weg; im Browser wird ein Backup, das älter als die letzte Änderung der Datei ist, nicht angeboten. Ein Backup, dessen Datei eine Woche lang nicht geöffnet wurde, etwa weil die Datei verschoben wurde, steht ebenfalls in **Nicht gespeicherte Arbeit wiederherstellen**.

Das Deaktivieren der Wiederherstellung beendet die automatische Aufbewahrung und entfernt Wiederherstellungskopien aktuell geöffneter Dokumente. Snapshots früher geschlossener Dokumente werden dabei nicht gesammelt gelöscht. Die Wiederherstellung ist lokal auf diese Installation bzw. dieses Browser-Profil beschränkt; sie ersetzt weder das Speichern einer Datei noch eine Cloud-Synchronisierung oder ein Backup.

## Extras {#goodies}

Die Geschenk-Schaltfläche in der oberen Leiste, **Objekt → Extras…** oder die Befehlspalette öffnet die Extras, eine Sammlung von Ausgangspunkten: Stile, die Sie an den AI-Chat anheften, die Designsysteme, die Sie aktivieren können, Skripte, die als [Skript-Ebenen](/user-guide/script-layers) auf der Arbeitsfläche landen, und die Shader der Galerie, die die ausgewählten Ebenen oder ein neues Rechteck füllen.

## Eigenschaften-Panel

Das Eigenschaften-Panel rechts wechselt zwischen Design und Code, daneben steht [Prüfen](/user-guide/checking-designs) als Symbol-Registerkarte. Der AI-Chat öffnet sich in einer eigenen Spalte daneben.

### Registerkarte „Design“

Zeigt die Eigenschaften der ausgewählten Objekte, gegliedert in Bereiche:

- **Darstellung:** Deckkraft, Eckenradius (mit Schalter für unabhängige Ecken), Sichtbarkeit.
- **Füllung:** Volltonfarbe, Verläufe (linear, radial, Winkel, Diamant), Bildfüllungen, Variablenbindungen.
- **Kontur:** Farbe, Stärke, Enden, Verbindungen, Strichelung.
- **Effekte:** Schlagschatten, innerer Schatten, Ebenen-, Hintergrund- und Vordergrundunschärfe.
- **Typografie:** Schriftfamilie, Größe, Schnitt, Formatierungsschaltflächen B/I/U/S (bei Textobjekten sichtbar).
- **Layout:** Einstellungen für [Auto-Layout](./auto-layout) (bei Auto-Layout-Rahmen sichtbar).
- **Export:** Maßstab, Format und Export-Schaltfläche (siehe [Export](./exporting)).

Ist nichts ausgewählt, zeigt die Registerkarte „Design“ Eigenschaften der Seite, darunter die Hintergrundfarbe der Arbeitsfläche.

### Registerkarte „Code“

Zeigt das ausgewählte Objekt als Code mit Syntaxhervorhebung, Zeilennummern und einer Kopierschaltfläche. Ein Formatschalter wechselt zwischen zwei Ausgaben:

- **Pairdraw JSX:** ein eigener Komponentenbaum, kompatibel mit `renderJSX()`, für den programmatischen Hin- und Rückweg.
- **Tailwind CSS v4:** HTML mit Utility-Klassen (`<div className="flex gap-4 p-3">`), bereit zum Einfügen in React- oder Vue-Projekte.

## Spalte des AI-Chats

Der [AI-Chat](/de/programmable/ai-chat) erstellt und ändert Designelemente aus Anfragen in natürlicher Sprache. Er öffnet sich in einer eigenen Spalte rechts neben dem Eigenschaften-Panel, sodass die Registerkarte „Design“ sichtbar bleibt, während ein Agent arbeitet. Öffnen und schließen Sie ihn mit der Schaltfläche mit den Funkeln bei den Aktionen des Dokuments in der oberen Leiste oder mit <kbd>⌘</kbd><kbd>J</kbd>; ziehen Sie seinen Rand, um die Breite zu ändern. Die Spalte bleibt über Neuladen hinweg offen oder geschlossen, in der zuletzt eingestellten Breite. Wiederverwendbare Modelle und Anbieterverbindungen richten Sie in den Einstellungen ein, und lokal gespeicherte Unterhaltungen durchsuchen Sie über das Verlaufsmenü des Chats.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Spalte des AI-Chats öffnen oder schließen | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Strg</kbd> + <kbd>J</kbd> |
| Ebenen suchen | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Strg</kbd> + <kbd>F</kbd> |

## Mobiles Layout

Auf Mobilgeräten und kleinen Bildschirmen ersetzt eine wischbare Schublade am unteren Rand die Seiten-Panels. Registerkarten oben in der Schublade wechseln zwischen den Ansichten Ebenen, Eigenschaften, Design, Code und AI. Die Werkzeugleiste schrumpft zu einem kompakten horizontalen Streifen mit Kategorienwechsel.

## Tipps

- Panelbreiten, auch die der Spalte des AI-Chats, werden automatisch gespeichert und bleiben über Neuladen hinweg erhalten.
- Im Ebenen-Panel finden Sie überlappende Objekte, die auf der Arbeitsfläche schwer anzuklicken sind.
- Das [Kontextmenü](./context-menu) bietet weitere Aktionen für ausgewählte Objekte.
- Tastenkürzel für die Reihenfolge (<kbd>]</kbd>/<kbd>[</kbd>) sowie Sichtbarkeit und Sperre beschreibt [Auswählen und Bearbeiten](./selection-and-manipulation).
