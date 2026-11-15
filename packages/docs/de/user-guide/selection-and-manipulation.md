---
title: Auswählen und Bearbeiten
description: Objekte in Pairdraw auswählen, verschieben, in der Größe ändern, drehen, duplizieren und anordnen.
---

# Auswählen und Bearbeiten

Wählen Sie Objekte aus, um sie auf der Arbeitsfläche zu verschieben, in der Größe zu ändern, zu drehen, zu duplizieren und zu ordnen.

## Auswählen

- **Klicken** wählt ein Objekt aus (und hebt jede andere Auswahl auf). Wie in Figma wählt ein Klick innerhalb eines Rahmens der obersten Ebene dessen direktes Kind aus, etwa einen verschachtelten Rahmen oder eine Gruppe, nicht die tiefste Ebene; einen Rahmen der obersten Ebene klicken Sie über seinen Titel an, überall, wenn er leer ist, oder über seine Abstände und Innenabstände, wenn er Auto-Layout hat.
- **Fahren Sie über** einen Auto-Layout-Rahmen, werden seine direkten Kinder gepunktet umrandet; solange eine einzelne Ebene ausgewählt ist, ist der Rand ihres übergeordneten Auto-Layout-Rahmens gepunktet.
- **Doppelklicken** geht eine Ebene tiefer, ebenso ein weiterer Klick in einen ausgewählten Rahmen, eine Komponente oder eine Instanz; sobald eine Ebene ausgewählt ist, erreichen Klicks ihre Geschwister und Cousins direkt.
- <kbd>⌘</kbd> + Klick (<kbd>Strg</kbd> + Klick unter Windows und Linux) wählt die tiefste Ebene unter dem Cursor aus; halten Sie <kbd>⌘</kbd>, wird diese Ebene vor dem Klick hervorgehoben.
- <kbd>Shift</kbd> + Klick fügt ein Objekt der Auswahl hinzu oder entfernt es. Eine Ebene und ihr eigenes übergeordnetes oder untergeordnetes Objekt werden nie gemeinsam ausgewählt; ein Shift-Klick auf das eine ersetzt daher das andere.
- **Doppelklicken Sie auf den Namen** eines Rahmens oder einer Komponente über dem Objekt auf der Arbeitsfläche, um ihn direkt umzubenennen.
- **Rahmenauswahl:** Ziehen Sie auf einer freien Stelle der Arbeitsfläche ein Auswahlrechteck auf; beim Loslassen werden alle geschnittenen Objekte ausgewählt. Beginnt sie innerhalb eines Rahmens der obersten Ebene ohne Auto-Layout oder in einer Sektion, wählt sie die Ebenen dieses Containers aus; von der Seite aus wird ein Rahmen oder eine Sektion mit Ebenen nur ausgewählt, wenn sie vollständig umschlossen ist.
- <kbd>⌘</kbd> + Ziehen (<kbd>Strg</kbd> + Ziehen unter Windows und Linux) erstellt eine Rahmenauswahl, die die tiefsten verschachtelten Ebenen auswählt, die sie berührt. Sie beginnt dort, wo auch eine normale Rahmenauswahl beginnt: auf leerer Arbeitsfläche oder dem leeren Hintergrund eines Rahmens der obersten Ebene oder einer Sektion. Auf einer Ebene oder dem Hintergrund eines verschachtelten Rahmens, einer Komponente oder einer Instanz wählt <kbd>⌘</kbd> + Ziehen dieses Objekt aus und verschiebt es. Drücken oder lösen Sie <kbd>⌘</kbd> während des Ziehens, wechselt die Auswahl zwischen tiefer und normaler Rahmenauswahl.
- <kbd>⌘</kbd><kbd>A</kbd> wählt alle Objekte der aktuellen Seite aus.
- <kbd>Enter</kbd> wählt die Kinder der ausgewählten Ebenen aus; bei einem Vektor bearbeitet es den Pfad, bei Text den Text.
- <kbd>Shift</kbd> + <kbd>Enter</kbd> oder <kbd>\\</kbd> wählt das übergeordnete Objekt der ausgewählten Ebenen aus.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> wählt das nächste oder vorherige Geschwisterobjekt aus, im Ebenen-Panel nach unten oder oben, und beginnt an den Enden von vorn.
- **Ein Klick auf eine freie Stelle** hebt die Auswahl auf.

## Verschieben

- **Ziehen** Sie ein ausgewähltes Objekt, um es zu verschieben (alle ausgewählten Objekte bewegen sich gemeinsam).
- **Pfeiltasten** verschieben die Auswahl um den kleinen Schritt, standardmäßig 1 px.
- <kbd>Shift</kbd> + Pfeiltasten verschieben um den großen Schritt, standardmäßig 10 px.

Beide Abstände stellen Sie unter **Einstellungen → Editor → Pfeiltasten** ein.

## Größe ändern

Ausgewählte Objekte zeigen acht Griffe: vier an den Ecken und vier in der Mitte der Kanten. Ziehen Sie einen Griff, um die Größe zu ändern.

- <kbd>Shift</kbd> beim Ziehen eines Eckgriffs erhält die Proportionen.

## Skalierwerkzeug

Drücken Sie <kbd>K</kbd> oder wählen Sie **Skalieren** im Menü des Werkzeugs „Verschieben“ in der Werkzeugleiste, um Ebenen mit ihrem gesamten Inhalt zu skalieren: Schriftgrößen, Konturen, Effekte, Eckenradien und Auto-Layout-Abstände wachsen und schrumpfen mit der Ebene, wie mit Figmas Skalierwerkzeug. Ziehen Sie einen Auswahlgriff, um von der gegenüberliegenden Seite aus zu skalieren, oder halten Sie <kbd>Option</kbd>/<kbd>Alt</kbd> gedrückt, um von der Mitte aus zu skalieren; mehrere ausgewählte Ebenen skalieren gemeinsam um ihre gemeinsame Begrenzung.

Solange das Skalierwerkzeug aktiv ist, zeigt das Design-Panel Breite und Höhe der Auswahl, einen Skalierungsfaktor und ein Ankerraster. Eine eingegebene Breite oder Höhe skaliert die Auswahl proportional darauf; der Faktor nimmt `2`, `2x` oder `200%` an. Das Ankerraster legt fest, welcher Punkt an seinem Platz bleibt. Jede Skalierung ist ein Rückgängig-Schritt.

## In Rahmen hinein und aus Rahmen heraus

Ein gezogenes Objekt landet beim Loslassen im Rahmen unter dem Cursor, egal wie wenig davon darin liegt, und verlässt seinen Rahmen, sobald der Cursor ihn verlässt. Gruppen und gesperrte Rahmen nehmen keine abgelegten Objekte auf, und ein Komponentensatz nimmt nur seine eigenen Varianten zurück; ein Objekt in einer Gruppe bleibt darin, sofern Sie es nicht auf einem anderen Rahmen ablegen, und die Gruppe passt ihre Größe an ihren Inhalt an. Eine Gruppe, die ihr letztes Objekt verliert, wird entfernt. Drücken Sie innerhalb eines ausgewählten Rahmens, einer Gruppe oder eines Komponentensatzes, ziehen Sie diesen und nicht das Objekt unter dem Cursor.

- <kbd>Shift</kbd> + Ziehen beschränkt die Bewegung auf eine Achse.
- <kbd>Space</kbd> beim Ziehen halten lässt die Objekte in ihren aktuellen übergeordneten Objekten.
- <kbd>⌃</kbd> + Ziehen (<kbd>Strg</kbd> + Ziehen unter Windows und Linux) schaltet das Ausrichten aus; in einen Auto-Layout-Rahmen abgelegt, wird das Objekt absolut positioniert.

Gesperrte Objekte in einer Auswahl bleiben an ihrem Platz, wenn sich der Rest bewegt.

## Drehen

Bewegen Sie den Mauszeiger knapp außerhalb eines Eckgriffs, bis der Drehcursor erscheint, und ziehen Sie, um zu drehen.

- <kbd>Shift</kbd> + Ziehen rastet die Drehung in Schritten von 15° ein.

## Duplizieren

- <kbd>Alt</kbd> + Ziehen (<kbd>⌥</kbd> + Ziehen auf dem Mac) dupliziert das ausgewählte Objekt und verschiebt die Kopie.
- <kbd>⌘</kbd><kbd>D</kbd> dupliziert an derselben Stelle; die Kopie eines einzelnen Rahmens der obersten Ebene, auf der Seite oder in einer Sektion, kommt in den ersten freien Platz rechts daneben.

Duplikate behalten ihre Namen. Duplizieren Sie eine Hauptkomponente auf diese Weise, entsteht eine Instanz davon.

## Einfügen

<kbd>⌘</kbd><kbd>V</kbd> behält die kopierte Position bei. In einen ausgewählten Rahmen eingefügt, behalten Objekte ihren Abstand zu dem Rahmen, aus dem sie kopiert wurden, und werden auf jeder Achse zentriert, auf der sie nicht hineinpassen; Objekte, die außerhalb der Ansicht landen würden, werden in ihr zentriert. Mit **Hier einfügen** im [Kontextmenü](./context-menu) fügen Sie am Cursor ein.

## Löschen

<kbd>Backspace</kbd> oder <kbd>Entf</kbd> entfernt alle ausgewählten Objekte.

## Reihenfolge

Ändern Sie die Stapelreihenfolge von Objekten innerhalb ihres übergeordneten Objekts:

- <kbd>]</kbd> bringt die Auswahl in den Vordergrund (an den Anfang der Geschwisterliste).
- <kbd>[</kbd> sendet sie in den Hintergrund (an das Ende der Geschwisterliste).

## Sichtbarkeit und Sperre

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> schaltet die Sichtbarkeit um. Ausgeblendete Objekte werden nicht gezeichnet, bleiben aber im Ebenen-Panel.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> schaltet die Sperre um. Gesperrte Objekte lassen sich auf der Arbeitsfläche weder auswählen noch verschieben.

## Auf Seite verschieben

Über das [Kontextmenü](./context-menu) verschieben Sie ausgewählte Objekte auf eine andere Seite. Die Objekte werden unter die Arbeitsfläche der Zielseite gehängt.

## Mehrere Ebenen bearbeiten

Sind mehrere Ebenen ausgewählt, zeigt das Eigenschaften-Panel ihre Gemeinsamkeiten und **Gemischt**, wo sie sich unterscheiden; eine Änderung wirkt auf alle in einem Rückgängig-Schritt.

- **Layout** zeigt ihre Größen, die Größenanpassung von Text, wenn Text ausgewählt ist, den Fluss, wenn jede Ebene ein Rahmen ist, und „Inhalt zuschneiden“ für die Rahmen darunter. Bilden die Ebenen eine Reihe oder Spalte, zeigt **Abstand** den Abstand zwischen ihnen; ein eingegebener Wert verteilt sie gleichmäßig ab der ersten Ebene.
- **Typografie** erscheint, sobald Text ausgewählt ist, und ändert nur den Text.
- **Kontur** zeigt die Kontur der Ebenen, die eine haben; eine Änderung versieht jede ausgewählte Ebene mit einer Kontur.
- **Auswahlfarben** listet jede Füll- und Konturfarbe der Auswahl, auch innerhalb von Rahmen und Gruppen, die häufigste zuerst. Ändern Sie eine, wird sie überall umgefärbt, wo sie verwendet wird.

## Sektionen

Eine Sektion übernimmt die Geschwisterobjekte, die sie vollständig abdeckt, wenn Sie sie darüber zeichnen, verschieben oder in der Größe ändern.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Alles auswählen | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Strg</kbd> + <kbd>A</kbd> |
| Duplizieren | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Strg</kbd> + <kbd>D</kbd> |
| Duplizieren und verschieben | <kbd>⌥</kbd> + Ziehen | <kbd>Alt</kbd> + Ziehen |
| Skalierwerkzeug | <kbd>K</kbd> | <kbd>K</kbd> |
| Auf einer Achse verschieben | <kbd>⇧</kbd> + Ziehen | <kbd>Shift</kbd> + Ziehen |
| Aktuelles übergeordnetes Objekt behalten | <kbd>Space</kbd> beim Ziehen | <kbd>Space</kbd> beim Ziehen |
| Ohne Ausrichten verschieben | <kbd>⌃</kbd> + Ziehen | <kbd>Strg</kbd> + Ziehen |
| Löschen | <kbd>⌫</kbd> / <kbd>Entf</kbd> | <kbd>Backspace</kbd> / <kbd>Entf</kbd> |
| 1 px verschieben | Pfeiltasten | Pfeiltasten |
| 10 px verschieben | <kbd>⇧</kbd> + Pfeiltasten | <kbd>Shift</kbd> + Pfeiltasten |
| In den Vordergrund | <kbd>]</kbd> | <kbd>]</kbd> |
| In den Hintergrund | <kbd>[</kbd> | <kbd>[</kbd> |
| Sichtbarkeit umschalten | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>H</kbd> |
| Sperre umschalten | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>L</kbd> |

## Tipps

- Im Panel [Ebenen und Seiten](./layers-and-pages) sehen und ordnen Sie überlappende Objekte.
- Weitere Aktionen wie Gruppieren und Komponenten erstellen beschreibt [Kontextmenü](./context-menu).
