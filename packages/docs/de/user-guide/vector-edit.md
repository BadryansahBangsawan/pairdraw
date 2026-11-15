---
title: Vektoren bearbeiten
description: 'Pfadgeometrie bearbeiten: Ankerpunkte, Béziergriffe, Modifikatortasten und Zeichenstift-Aktionen im Bearbeitungsmodus.'
---

# Vektoren bearbeiten

Im Vektorbearbeitungsmodus ändern Sie die **Geometrie** einer Kurve: Position der Ankerpunkte, Form der Segmente und Béziergriffe.
In diesem Modus bearbeiten Sie den Pfad selbst, nicht die üblichen Transformationen des Objekts.

## Bearbeitungsmodus öffnen

- Wählen Sie ein Vektorobjekt mit dem Auswahlwerkzeug aus.
- **Doppelklicken Sie auf die Kurve**.

Damit wird die Geometriebearbeitung für den ausgewählten Vektor aktiviert.

## Bearbeitungsmodus beenden

- Drücken Sie <kbd>Escape</kbd>.
- Klicken Sie auf eine freie Stelle der Arbeitsfläche.
- Oder wechseln Sie in einen anderen Bearbeitungskontext.

## Was sich in diesem Modus ändert

- Der übliche Transformationsrahmen des Objekts ist deaktiviert.
- Ankerpunkte, Segmente und Griffe lassen sich bearbeiten.
- An den Ecken der Ebenenbegrenzung wechselt der Cursor nicht zu Größe ändern oder Drehen; über dem Transformationsrahmen ausgewählter Punkte schon (siehe [Ausgewählte Punkte transformieren](#transform-selected-points)).

## Grundlagen

### Ankerpunkt verschieben

- Ziehen Sie einen Ankerpunkt.
- Verbundene Segmente und die Form des Pfads werden live in der Vorschau aktualisiert.

### Béziergriff bearbeiten

- Ziehen Sie einen Griff am Ankerpunkt.
- Standardmäßig richtet sich das Verhalten nach der aktuellen Griffkombination des Ankerpunkts.

### Segment auswählen und verschieben

- Klicken Sie auf ein Segment, um es auszuwählen. Das Segment wird blau und zeigt in seiner Mitte einen Knopf; seine Ankerpunkte bleiben unausgewählt.
- <kbd>Shift</kbd> + Klick fügt ein Segment der Auswahl hinzu oder entfernt ein ausgewähltes.
- Ziehen Sie ein Segment, um die beiden Ankerpunkte, die es verbindet, zusammen mit dem Rest der Auswahl zu verschieben.

### Mit einem Auswahlrechteck auswählen

- Ziehen Sie über eine freie Fläche, um die Ankerpunkte im Rechteck und die Segmente zwischen ihnen auszuwählen.
- <kbd>Shift</kbd> + Ziehen fügt sie der Auswahl hinzu.

### Eine Region auswählen

- Bewegen Sie den Zeiger in eine gefüllte Fläche: Die Region darunter wird mit diagonalen Linien schraffiert.
- Klicken Sie hinein, um die Region und alle ihre Punkte auszuwählen; ziehen Sie, um sie zu verschieben.
- <kbd>Shift</kbd> + Klick fügt die Region der Auswahl hinzu.

### Ankerpunkte und Segmente löschen

- Drücken Sie <kbd>Entf</kbd> oder <kbd>Backspace</kbd>, um die Auswahl zu löschen.
- Ein gelöschter Ankerpunkt nimmt seine Segmente mit.
- Ein gelöschtes Segment nimmt nur die Ankerpunkte mit, die danach unverbunden wären; das Löschen des mittleren Segments eines Pfads teilt ihn also in zwei.
- Wird alles gelöscht, wird die Ebene gelöscht.

## Schneiden, verbinden und umformen

| Aktion                       | Mac                                       | Windows / Linux                         |
| ---------------------------- | ----------------------------------------- | --------------------------------------- |
| Schneidewerkzeug             | <kbd>X</kbd>                              | <kbd>X</kbd>                            |
| Glatter Punkt oder Eckpunkt  | Doppelklick auf einen Punkt               | Doppelklick auf einen Punkt             |
| Segment begradigen           | <kbd>Cmd</kbd> + Doppelklick              | <kbd>Strg</kbd> + Doppelklick           |
| Segment biegen               | <kbd>Cmd</kbd> + Ziehen an einem Segment  | <kbd>Strg</kbd> + Ziehen an einem Segment |
| Biegen, Nachbarn beibehalten | <kbd>Cmd</kbd> + <kbd>Option</kbd> + Ziehen | <kbd>Strg</kbd> + <kbd>Alt</kbd> + Ziehen |
| Zwei Endpunkte verbinden     | <kbd>Cmd</kbd> + <kbd>J</kbd>             | <kbd>Strg</kbd> + <kbd>J</kbd>          |
| Punkte duplizieren           | <kbd>Option</kbd> + Ziehen                | <kbd>Alt</kbd> + Ziehen                 |
| Punkte verschieben           | Pfeiltasten                               | Pfeiltasten                             |

- **Schneidewerkzeug:** Drücken Sie <kbd>X</kbd> und klicken Sie auf ein Segment, um es dort zu schneiden, oder auf einen Punkt, um die Segmente zu trennen, die sich dort treffen. Kurven behalten ihre Form, und eine geschnittene geschlossene Form wird nicht mehr gefüllt. <kbd>X</kbd>, <kbd>Escape</kbd> oder eine andere Werkzeugtaste legt es wieder ab.
- **Glatt oder Ecke:** Doppelklicken Sie auf einen Eckpunkt, um ihm Griffe entlang der Linie zwischen seinen Nachbarn zu geben, und doppelklicken Sie auf einen glatten Punkt, um seine Griffe zu entfernen.
- **Begradigen:** <kbd>Cmd</kbd>/<kbd>Strg</kbd> + Doppelklick auf ein gekrümmtes Segment entfernt beide Griffe.
- **Verbinden:** Wählen Sie zwei Endpunkte aus und drücken Sie <kbd>Cmd</kbd>/<kbd>Strg</kbd> + <kbd>J</kbd>. Punkte an derselben Stelle werden zu einem Punkt; auseinanderliegende Punkte werden durch ein gerades Segment verbunden. Verbinden Sie die beiden Enden eines Pfads, wird er geschlossen und gefüllt. Während ein Pfad bearbeitet wird, verbindet dieses Kürzel Punkte, statt den Chat zu öffnen.
- **Duplizieren:** Halten Sie <kbd>Option</kbd>/<kbd>Alt</kbd> und ziehen Sie ausgewählte Punkte oder Segmente, um eine Kopie zu ziehen. Die Kopie eines einzelnen Punkts bleibt mit ihm verbunden, sodass das Ziehen den Pfad verlängert.
- **Verschieben:** Die Pfeiltasten verschieben die ausgewählten Punkte um den Schritt aus Einstellungen → Editor, <kbd>Shift</kbd> + Pfeiltaste um den großen Schritt.
- **Biegen:** <kbd>Cmd</kbd>/<kbd>Strg</kbd> + Ziehen an einem Segment biegt es so, dass die gegriffene Stelle dem Zeiger folgt. Ein glatter Endpunkt bleibt glatt, und sein anderer Griff dreht sich mit. Nehmen Sie <kbd>Option</kbd>/<kbd>Alt</kbd> hinzu, bleiben die Griffe der Nachbarsegmente stehen; die Endpunkte werden dann zu Eckpunkten.

## Ausgewählte Punkte transformieren {#transform-selected-points}

Sind zwei Punkte oder Segmente ausgewählt, umgibt sie ein Transformationsrahmen.

- Ziehen Sie an einer Ecke oder Kante, um die ausgewählten Punkte von der Gegenseite aus zu skalieren. Halten Sie <kbd>Shift</kbd>, um die Proportionen zu erhalten, und <kbd>Option</kbd>/<kbd>Alt</kbd>, um von der Mitte aus zu skalieren.
- Ziehen Sie knapp außerhalb einer Ecke, um sie um die Mitte des Rahmens zu drehen. Halten Sie <kbd>Shift</kbd>, um in 15°-Schritten zu drehen.
- Punkte und Segmente unter dem Zeiger bleiben über dem Rahmen ziehbar, und jede Transformation lässt sich in einem Schritt rückgängig machen.

## Modifikatortasten beim Ziehen von Griffen

| Aktion                                 | Mac                        | Windows / Linux           |
| -------------------------------------- | -------------------------- | ------------------------- |
| Durchgehend (glatt / durchgehend)      | <kbd>Cmd</kbd> + Ziehen    | <kbd>Strg</kbd> + Ziehen  |
| Ecke (unabhängige Griffe)              | <kbd>Option</kbd> + Ziehen | <kbd>Alt</kbd> + Ziehen   |
| Richtung sperren (nur Länge)           | <kbd>Shift</kbd> + Ziehen  | <kbd>Shift</kbd> + Ziehen |

### Durchgehend: <kbd>Cmd</kbd>/<kbd>Strg</kbd> + Ziehen

- Der aktive Griff bleibt auf derselben Linie wie sein Gegengriff.
- Nur die Länge des aktiven Griffs ändert sich.
- Damit entstehen glatte Übergänge ohne Knick.

### Ecke: <kbd>Option</kbd>/<kbd>Alt</kbd> + Ziehen

- Der aktive Griff wird unabhängig bearbeitet.
- Der Gegengriff bleibt an seinem Platz.
- Damit entsteht ein scharfer Eckübergang.

### Richtung sperren: <kbd>Shift</kbd> + Ziehen

Für Ankerpunkte mit **durchgehender** oder **symmetrischer** Griffkombination:

- Die Griffrichtung bleibt auf dem Wert von **vor Beginn des aktuellen Ziehens** gesperrt.
- Das Ziehen ändert nur die Länge des Griffs (oder je nach Kombination beider Griffe).

## Biegen durch Ziehen eines Ankerpunkts

Ziehen Sie einen Ankerpunkt mit gedrückter <kbd>Cmd</kbd>/<kbd>Strg</kbd>-Taste, wählt der Editor den Zielgriff anhand der **Richtung, in der das Segment** an diesem Ankerpunkt ansetzt (nicht anhand der Entfernung zum nächsten Nachbarpunkt).
Das funktioniert auch bei verzweigten Ankerpunkten in Vektornetzen: Einmal bestimmt, bleibt der Zielgriff für das aktuelle Ziehen gesperrt.

## Zeichenstift im Bearbeitungsmodus

Bei aktivem Zeichenstift:

- **Klick auf ein Segment** fügt einen neuen Ankerpunkt ein (teilt das Segment).
- **Klick auf den Endpunkt eines offenen Pfads** setzt das Zeichnen von diesem Punkt aus fort.
- **Option/Alt + Klick auf einen Ankerpunkt** entfernt ihn (sofern die Struktur dies erlaubt).

Wie Pfade erstellt und geschlossen werden, beschreibt [Zeichenstift](./pen-tool.md).

## Praktischer Ablauf

1. Zeichnen Sie eine Form mit dem Zeichenstift.
2. Doppelklicken Sie auf die Kurve, um den Vektorbearbeitungsmodus zu öffnen.
3. Verschieben Sie Ankerpunkte, um die Silhouette zu verfeinern.
4. Ziehen Sie Griffe:
   - mit <kbd>Cmd</kbd>/<kbd>Strg</kbd> für glatte, durchgehende Übergänge,
   - mit <kbd>Option</kbd>/<kbd>Alt</kbd> für unabhängige Änderungen,
   - mit <kbd>Shift</kbd> für Änderungen nur der Länge.
5. Drücken Sie <kbd>Escape</kbd>, um den Modus zu beenden.
