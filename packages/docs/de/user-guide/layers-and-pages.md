---
title: Ebenen und Seiten
description: Ebenen, Seiten und das Eigenschaften-Panel in OpenPencil verwenden.
---

# Ebenen und Seiten

Die Oberfläche besteht aus dem Ebenen-Panel links, der Arbeitsfläche in der Mitte und dem Eigenschaften-Panel rechts.

## Ebenen

Das Ebenen-Panel zeigt die Dokumenthierarchie als Baum.

- Rahmen, Gruppen und Komponenten lassen sich auf- und zuklappen.
- Eine Ebene kann durch Ziehen umgeordnet oder in einen anderen Container verschoben werden.
- Das Augensymbol schaltet die Sichtbarkeit um.
- Ein Doppelklick auf den Namen startet die Umbenennung.

Eine Auswahl auf der Arbeitsfläche wird im Baum markiert und umgekehrt.

## Seiten

- Ein Klick wechselt die Seite.
- Die Schaltfläche Hinzufügen erstellt eine Seite.
- Löschen entfernt die aktuelle Seite.
- Ein Doppelklick ändert den Namen.

Jede Seite besitzt einen eigenen Hintergrund sowie eine eigene Ansichtsposition und Vergrößerung.

## Folien

Das Folien-Panel listet die Rahmen der obersten Ebene der Seite als nummerierte Folienminiaturen in Ebenenreihenfolge. Ein Klick auf eine Folie zeigt ihren Rahmen auf der Arbeitsfläche; ziehen Sie eine Folie — oder drücken Sie <kbd>Alt</kbd> mit Pfeil nach oben oder unten —, um sie umzuordnen. **Folien exportieren** schreibt alle Folien in dieser Reihenfolge in eine PDF- oder PowerPoint-Datei.

## Präsentieren

Präsentieren zeigt die Folien der Seite im Vollbild an, immer eine gleichzeitig. Starten Sie es mit <kbd>⌘</kbd>/<kbd>Strg</kbd> + <kbd>Enter</kbd>, über **Ansicht → Präsentieren** oder die Schaltfläche Präsentieren in der oberen Leiste. Die Pfeiltasten, <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>Bild auf</kbd>/<kbd>Bild ab</kbd> und das Mausrad blättern durch die Folien; <kbd>Escape</kbd> verlässt die Präsentation und gibt die Arbeitsfläche und den Tastaturfokus dorthin zurück, wo sie waren. Eine Folie, die höher als der Bildschirm ist, wird bei 100 % gezeigt und kann gescrollt werden.

## Dokumente und Wiederherstellung

Der Arbeitsbereich Start listet aktuelle lokale Dokumente und Dokumente aus konfigurierten Speicheranbietern auf. Verwenden Sie die Raster- oder Listenansicht und sortieren Sie aktuelle Dateien nach **Name**, **Zuletzt verwendet** oder **Erstellt**. <kbd>⌘</kbd>/<kbd>Strg</kbd>-Klick fügt eine Datei zur Auswahl hinzu, <kbd>Shift</kbd>-Klick wählt einen Bereich aus, und <kbd>⌘</kbd>/<kbd>Strg</kbd>+<kbd>A</kbd> wählt alle gelisteten Dateien; die Auswahlleiste öffnet sie dann in separaten Editor-Tabs, entfernt sie aus „Zuletzt verwendet“ oder löscht gespeicherte Dokumente. Das <kbd>⋯</kbd>-Menü einer Datei oder ihr Rechtsklick-Menü bietet **Aus „Zuletzt verwendet“ entfernen**, das die Datei vergisst, ohne sie zu löschen, und **Sichern unter…**, das eine Kopie anderweitig sichert. **Design-Systeme** listet die Komponentenbibliotheken auf, die Sie veröffentlicht haben; wählt man eine aus, öffnet sich ein neues Design mit aktivierter Bibliothek im Assets-Panel.

Ein neues Design bleibt während der Arbeit als Entwurf auf diesem Gerät: Jede Änderung wird kurz nach dem Machen geschrieben, das Schließen seines Tabs fragt also nichts. **Entwürfe** auf Start listet sie mit einer Vorschau; öffnen Sie einen, um weiterzuarbeiten, oder wählen Sie **Entwurf löschen** aus seinem <kbd>⋯</kbd>- oder Rechtsklick-Menü, um ihn endgültig zu entfernen. Sichert man einen Entwurf in eine Datei oder in einen Speicher, im Editor oder mit **Sichern unter…** auf Start, verlässt er die Entwürfe. Entwürfe leben nur in diesem Browser-Profil bzw. dieser Desktop-Installation und setzen **Ungespeicherte Arbeit automatisch sichern** sowie einen Browser voraus, der Websitedaten behält.

Unter **Einstellungen → Allgemein → Wiederherstellung** steuert **Ungespeicherte Arbeit automatisch sichern** Entwürfe und lokale Wiederherstellungskopien. Ist die Wiederherstellung aktiviert, bleiben nicht gesicherte Dokumente ohne Dateipfad wiederherstellbar, auch nachdem ihre Tabs geschlossen wurden. Bietet OpenPencil **Nicht gesicherte Arbeit wiederherstellen** an, wählen Sie **Wiederherstellen**, um ein Dokument erneut zu öffnen, oder **Verwerfen**, um seine Wiederherstellungskopie zu entfernen.

Eine geöffnete Datei behält auch ein Backup von Änderungen, die noch nicht mit ihr gesichert wurden — geschrieben, solange Autosave aus ist, oder wenn das Fenster schließt, bevor Autosave sie geschrieben hat. Öffnet sich die Datei das nächste Mal, bietet **Wiederhergestellte Änderungen** **Speichern** an, um sie in die Datei zu schreiben, **Speichern unter…**, um sie getrennt zu öffnen und als neue Datei zu speichern, oder **Nicht speichern**, um die Datei unverändert zu lassen und das Backup fallen zu lassen. Schließen des Dialogs behält das Backup für das nächste Mal. Sichert man die Datei, fallen ihre älteren Backups weg; im Browser wird ein Backup, das älter als die letzte Änderung der Datei ist, nicht angeboten. Ein Backup, dessen Datei eine Woche lang nicht geöffnet wurde, etwa weil die Datei umgezogen ist, steht ebenfalls in **Nicht gesicherte Arbeit wiederherstellen**.

Deaktivieren der Wiederherstellung beendet die automatische Aufbewahrung und entfernt Wiederherstellungskopien aktuell geöffneter Dokumente. Sie löscht keine Snapshots früher geschlossener Dokumente massenhaft. Die Wiederherstellung ist lokal zu dieser Installation bzw. diesem Browser-Profil; sie ersetzt weder das Sichern einer Datei, noch Cloud-Synchronisation oder ein Backup.

## Eigenschaften

### Design

Zeigt Darstellung, Füllung, Kontur, Effekte, Typografie, Anordnung und Export der Auswahl.

### Code

Zeigt die Auswahl als JSX mit Syntaxhervorhebung und ermöglicht den Export als HTML mit Tailwind CSS v4.

### AI-Chat

Der AI-Chat öffnet sich in einer eigenen Spalte rechts neben den Eigenschaften, sodass der Design-Bereich sichtbar bleibt. Die Schaltfläche mit den Funkeln bei den Aktionen des Dokuments in der oberen Leiste oder <kbd>⌘</kbd><kbd>J</kbd> beziehungsweise <kbd>Strg</kbd><kbd>J</kbd> öffnet und schließt die Spalte; ihre Breite lässt sich am Rand ziehen und bleibt nach dem Neuladen erhalten.

## Kleine Bildschirme

Auf kleinen Bildschirmen ersetzen untere Registerkarten die Seiten-Panels.
