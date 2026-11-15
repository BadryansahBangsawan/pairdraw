---
title: Zeichenstift
description: Vektorpfade mit Bézierkurven mit dem Zeichenstift in Pairdraw zeichnen.
---

# Zeichenstift

Der Zeichenstift erstellt Vektorpfade auf Grundlage des Vektornetzmodells, kompatibel mit Figmas `.fig`-Format.

## Aktivieren

Drücken Sie <kbd>P</kbd>, um den Zeichenstift zu aktivieren.

## Ankerpunkte setzen

- **Klicken** setzt einen Eckpunkt (gerades Segment).
- **Klicken und Ziehen** setzt einen Kurvenpunkt mit Bézier-Tangentengriffen; Richtung und Länge des Ziehens bestimmen die Form der Kurve.
  - Halten Sie während des Ziehens (ohne die Maustaste loszulassen) <kbd>Space</kbd> gedrückt, um den Punkt selbst zu verschieben.

Setzen Sie mehrere Punkte, um einen Pfad Segment für Segment aufzubauen. Eine Vorschaulinie führt beim Bewegen vom zuletzt gesetzten Punkt zum Mauszeiger.

## Pfad schließen

Klicken Sie auf den **ersten Punkt** des Pfads, um ihn zu einer Schleife zu schließen. Geschlossene Pfade können eine Füllung haben.

## Offene Pfade

<kbd>Escape</kbd> übernimmt den aktuellen Pfad als offenen Pfad. Offene Pfade werden nur als Kontur dargestellt und nicht gefüllt.

## Vektornetze

Pfade in Pairdraw sind Vektornetze, ein flexibleres Modell als einfache Punktlisten, das verzweigte Pfade und komplexe Strukturen erlaubt. Figma verwendet dasselbe Modell, daher bleiben Pfade in `.fig`-Dateien beim Hin- und Rückweg exakt erhalten.

## Im Bearbeitungsmodus fortsetzen

- Ein Klick auf den Endpunkt eines offenen Pfads setzt das Zeichnen fort.
- Ein Klick auf ein Segment fügt einen Punkt ein.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + Klick entfernt einen Punkt, sofern die Struktur dies erlaubt.

Weitere Informationen: [Vektoren bearbeiten](./vector-edit).

## Bleistift

Drücken Sie <kbd>⇧</kbd><kbd>P</kbd> oder wählen Sie **Bleistift** im Menü des Zeichenstifts in der Werkzeugleiste, um freihand zu zeichnen. Jeder Strich wird zu einer eigenen Vektorebene, geglättet zu Kurven, die Sie wie jeden anderen Pfad bearbeiten können, und der Bleistift bleibt für den nächsten Strich aktiv.

- Zoomen Sie hinein, um mehr Details zu behalten: Die Kurve folgt Ihrem Strich bis auf wenige Bildschirmpixel genau.
- Halten Sie <kbd>Shift</kbd>, um vom Punkt, an dem Sie die Taste gedrückt haben, gerade, horizontal oder vertikal zu zeichnen.
- Beenden Sie einen Strich dort, wo er begonnen hat, um ihn zu einer Schleife zu schließen.
- Ein Strich kommt in den Rahmen, der ihn vollständig enthält, sonst auf die Seite.
- Neue Striche heben sich von dem ab, worauf sie gezeichnet werden. Ändern Sie die Kontur des zuletzt gezeichneten Strichs, behält der Bleistift diesen Stil bei.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Zeichenstift | <kbd>P</kbd> | <kbd>P</kbd> |
| Bleistift | <kbd>⇧</kbd><kbd>P</kbd> | <kbd>Shift</kbd> + <kbd>P</kbd> |
| Offenen Pfad übernehmen | <kbd>Escape</kbd> | <kbd>Escape</kbd> |

## Tipps

- Die Vorschaulinie beginnt immer am zuletzt gesetzten Punkt; sie springt nicht zu (0,0).
- Ziehen Sie beim Setzen eines Kurvenpunkts weiter, um die Kurve breiter zu machen.
- Nach dem Erstellen eines Pfads passen Sie Füllung, Kontur und Effekte im Eigenschaften-Panel an.
