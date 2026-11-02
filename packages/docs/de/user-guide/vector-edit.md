---
title: Vektoren bearbeiten
description: Ankerpunkte, Béziergriffe und Segmente bearbeiten und den Zeichenstift im Bearbeitungsmodus verwenden.
---

# Vektoren bearbeiten

Im Vektorbearbeitungsmodus wird die Geometrie eines Pfads verändert: Position der Ankerpunkte, Form der Segmente und Béziergriffe.

## Bearbeitungsmodus öffnen

1. Vektorobjekt mit dem Auswahlwerkzeug auswählen.
2. Die Kurve doppelklicken.

<kbd>Escape</kbd> beendet den Modus.

## Grundlagen

- Ankerpunkt ziehen, um die verbundenen Segmente zu verändern.
- Béziergriff ziehen, um die Krümmung anzupassen.
- <kbd>Cmd</kbd>/<kbd>Strg</kbd> hält beide Griffe auf einer Linie.
- <kbd>Option</kbd>/<kbd>Alt</kbd> verändert einen Griff unabhängig.
- <kbd>Shift</kbd> behält die Richtung bei und verändert nur die Länge.

Beim Ziehen eines Ankerpunkts mit <kbd>Cmd</kbd>/<kbd>Strg</kbd> bestimmt OpenPencil den Zielgriff anhand der Richtung des verbundenen Segments. Das funktioniert auch bei verzweigten Vektornetzen.

## Schneiden, verbinden und umformen

- <kbd>X</kbd> wählt das Schneidewerkzeug. Ein Klick auf ein Segment schneidet es dort, ein Klick auf einen Ankerpunkt trennt die Segmente, die sich dort treffen. <kbd>X</kbd>, <kbd>Escape</kbd> oder eine andere Werkzeugtaste legt es wieder ab.
- Doppelklick auf einen Ankerpunkt wechselt zwischen glattem Punkt und Eckpunkt.
- <kbd>Cmd</kbd>/<kbd>Strg</kbd> + Doppelklick auf ein Segment entfernt seine Griffe und macht es gerade.
- <kbd>Cmd</kbd>/<kbd>Strg</kbd> + <kbd>J</kbd> verbindet zwei ausgewählte Endpunkte: Punkte an derselben Stelle werden zu einem Punkt, sonst entsteht ein gerades Segment. Verbindet es die beiden Enden eines Pfads, wird er geschlossen und gefüllt. Während ein Pfad bearbeitet wird, öffnet dieses Kürzel nicht den Chat.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + Ziehen zieht eine Kopie der ausgewählten Punkte oder Segmente. Die Kopie eines einzelnen Punkts bleibt mit ihm verbunden.
- Die Pfeiltasten verschieben die ausgewählten Punkte um den Abstand aus Einstellungen → Editor, mit <kbd>Shift</kbd> um den großen Abstand.

## Zeichenstift im Bearbeitungsmodus

- Klick auf ein Segment fügt einen Ankerpunkt ein.
- Klick auf den Endpunkt eines offenen Pfads setzt das Zeichnen fort.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + Klick entfernt einen Ankerpunkt, sofern die Struktur dies erlaubt.

Siehe auch [Zeichenstift](./pen-tool.md).
