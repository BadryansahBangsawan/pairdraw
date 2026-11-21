---
title: Auto-Layout
description: Flex- und Grid-Layout in Pairdraw — Richtung, Abstand, Innenabstand, Ausrichtung, Größenmodi der Kinder und CSS-Grid-Spuren.
---

# Auto-Layout

Auto-Layout positioniert die untergeordneten Objekte eines Rahmens automatisch. Es gibt zwei Modi: **Flex** (horizontaler oder vertikaler Verlauf) und **Grid** (Zeilen und Spalten mit einstellbaren Spurgrößen).

## Auto-Layout aktivieren

- Rahmen auswählen und <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>) drücken, um Auto-Layout ein- oder auszuschalten.
- Freie Objekte ohne übergeordneten Rahmen auswählen und <kbd>⇧</kbd><kbd>A</kbd> drücken, um sie in einen neuen Auto-Layout-Rahmen einzuschließen.

Beim Einschließen einer Auswahl sortiert Pairdraw die Objekte nach ihrer sichtbaren Position: bei horizontalem Layout von links nach rechts, bei vertikalem von oben nach unten.

## Richtung

Legen Sie fest, wie die Kinder angeordnet werden:

- **Horizontal:** von links nach rechts.
- **Vertikal:** von oben nach unten.
- **Umbruch:** Reicht der Platz nicht, beginnt eine weitere Zeile oder Spalte.

## Abstände

### Abstand

Der Raum zwischen benachbarten Kindern. Ein einzelner Wert gilt zwischen allen Kindern.

### Innenabstand

Der Raum zwischen dem Rand des Rahmens und seinen Kindern. Stellen Sie einen einheitlichen Wert für alle Seiten ein oder klappen Sie die Einstellung auf, um jede Seite einzeln festzulegen (oben, rechts, unten, links).

## Ausrichtung

### Verteilung (Hauptachse)

Bestimmt, wie die Kinder entlang der Layoutrichtung verteilt werden:

- **Anfang:** Die Kinder sammeln sich am Anfang.
- **Mitte:** Die Kinder werden zentriert.
- **Ende:** Die Kinder sammeln sich am Ende.
- **Gleichmäßig verteilt:** Die Kinder werden mit gleichem Abstand dazwischen verteilt.
- **Abstand ringsum:** Jedes Kind erhält zusätzlich zum Abstand einen gleichen Anteil des freien Raums, je zur Hälfte auf beiden Seiten; die Option steht im Menü des Abstandsfelds.

### Ausrichtung (Querachse)

Bestimmt, wie die Kinder senkrecht zur Layoutrichtung positioniert werden:

- **Anfang:** am Anfang ausgerichtet.
- **Mitte:** zentriert.
- **Ende:** am Ende ausgerichtet.
- **Strecken:** Die Kinder füllen die Querachse aus.

## Größenmodi der Kinder

Jedes Kind in einem Auto-Layout-Rahmen kann einen eigenen Größenmodus haben:

- **Fest:** verwendet die eingestellte Breite oder Höhe des Kindes.
- **Füllen:** belegt den verfügbaren Raum im übergeordneten Rahmen.
- **An Inhalt anpassen:** schrumpft auf die Größe des Inhalts.

Die erste tatsächliche Änderung einer Breite oder Höhe schaltet nur diese Achse auf „Fest“. Der Fokus eines Feldes allein verändert den Modus nicht.

## Konturen ins Layout einbeziehen

Standardmäßig ordnet ein Auto-Layout-Rahmen seinen Inhalt so an, als hätte keine Ebene eine Kontur, wie in Figma. Schalten Sie im Bereich „Layout“ **Konturen ins Layout einbeziehen** ein, um Platz für Konturen zu schaffen: Die Kontur des Rahmens selbst schiebt seinen Inhalt nach innen, und die äußeren Konturen seiner Kinder belegen Raum zwischen ihnen.

Ein fester Auto-Layout-Rahmen ist nie kleiner als der Raum, den sein Innenabstand beansprucht, zuzüglich der inneren Konturen, die er zählt, wenn **Konturen ins Layout einbeziehen** eingeschaltet ist. Wird er kleiner gesetzt, wächst er auf diesen Raum, wie in Figma. Ein Rahmen, der vor dieser Änderung kleiner als sein Innenabstand gespeichert wurde, behält beim Öffnen der Datei seine gespeicherte Größe und wächst bei der nächsten Bearbeitung auf seinen Innenabstand.

## Per Ziehen umsortieren

Innerhalb eines Auto-Layout-Rahmens ziehen Sie ein Kind, um es zwischen seinen Geschwistern neu einzuordnen. Eine Einfügemarke zeigt, wo das Kind abgelegt wird. Ein Objekt, das Sie von anderswo in einen Auto-Layout-Rahmen ziehen, wird auf dieselbe Weise eingefügt; in einem umbrechenden Rahmen landet es in der Zeile unter dem Cursor. Zeichnen Sie innerhalb eines Auto-Layout-Rahmens, wird das neue Objekt am Ende seines Verlaufs angefügt.

Halten Sie beim Ziehen <kbd>⌃</kbd> (<kbd>Strg</kbd> unter Windows und Linux), um Auto-Layout zu ignorieren: Das Objekt wird dort, wo Sie loslassen, als absolut positioniertes Kind abgelegt.

## Eigenschaften-Panel

Ist ein Auto-Layout-Rahmen ausgewählt, zeigt der Bereich „Layout“ im Eigenschaften-Panel alle Auto-Layout-Einstellungen: Richtung, Abstand, Innenabstand, Verteilung und Ausrichtung.

## Tastenkürzel

| Aktion | Mac | Windows / Linux |
|--------|-----|-----------------|
| Auto-Layout ein-/ausschalten | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

Das Grid-Layout ordnet Kinder in Zeilen und Spalten mit ausdrücklich festgelegten Spurgrößen an.

### Grid aktivieren

Wählen Sie einen Rahmen mit aktiviertem Auto-Layout aus und klicken Sie in der Layout-Werkzeugleiste auf das Grid-Symbol, um von Flex zu Grid zu wechseln.

### Spurgrößen

Spalten- und Zeilenspuren lassen sich mit drei Größenmodi festlegen:

- **fr:** Bruchteil; teilt den verfügbaren Raum anteilig auf.
- **px:** feste Größe in Pixeln.
- **auto:** passt sich dem Inhalt an.

Beispiel: Drei Spalten mit `1fr 200px 1fr` ergeben eine feste mittlere Spalte mit flexiblen Seiten.

Setzen Sie einen Grid-Rahmen auf **An Inhalt anpassen**, um ihn auf seine Spuren und Abstände zu bemessen. Auf einer angepassten Achse nimmt eine Bruchteil-Spur (`fr`) die Größe ihres Inhalts an, statt Raum aufzuteilen, und Minimum und Maximum des Rahmens gelten weiterhin.

### Grid-Abstände

Horizontale (Spalten-) und vertikale (Zeilen-)Abstände zwischen den Zellen lassen sich getrennt einstellen.

### Positionierung der Kinder

Kinder werden automatisch in Zeilenreihenfolge auf die Zellen verteilt. Mit Startspalte, Startzeile und Spannweite in den Layout-Eigenschaften des Kindes überschreiben Sie die Platzierung.

### JSX- und Tailwind-Export

Grid-Layouts werden als JSX mit Tailwind-Klassen exportiert: `grid grid-cols-3`, `gap-x-4 gap-y-2`, `col-start-2 row-span-2`.

## Tipps

- Auto-Layout wird direkt nach dem Erstellen neu berechnet, sodass sich die Auswahlbegrenzung sofort aktualisiert.
- Verschachteln Sie Auto-Layout-Rahmen für komplexe, anpassungsfähige Layouts (zum Beispiel ein vertikaler Rahmen mit horizontalen Zeilen).
- Mit „Füllen“ nimmt ein Kind den verbleibenden Raum ein, wie `flex-grow: 1` in CSS.
- Grid eignet sich für Dashboards, Galerien und Formulare, also alles mit zweidimensionaler Struktur.
- Wie Sie die Rahmen erstellen, auf die Auto-Layout wirkt, beschreibt [Formen zeichnen](./drawing-shapes).
- Auto-Layout in wiederverwendbaren Komponenten beschreibt [Komponenten](./components).
