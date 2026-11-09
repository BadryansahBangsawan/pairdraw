---
title: Navigation auf der Arbeitsfläche
description: Ansicht verschieben, zoomen und das Handwerkzeug in Pairdraw verwenden.
---

# Navigation auf der Arbeitsfläche

Die Arbeitsfläche ist unbegrenzt. Verschieben und vergrößern Sie die Ansicht, um jeden Bereich des Dokuments zu erreichen.

## Ansicht verschieben

- <kbd>Space</kbd> gedrückt halten und auf der Arbeitsfläche ziehen;
- mit gedrückter mittlerer Maustaste ziehen;
- mit zwei Fingern auf dem Trackpad scrollen.

## Handwerkzeug

<kbd>H</kbd> aktiviert das Handwerkzeug. Solange es aktiv ist, verschiebt jedes Ziehen die Ansicht, ohne dass <kbd>Space</kbd> gedrückt werden muss.

Mit <kbd>V</kbd> wechseln Sie zurück zum Auswahlwerkzeug.

## Zoom

Der Zoom richtet sich nach der Position des Mauszeigers:

- <kbd>Ctrl</kbd> + Scroll beziehungsweise <kbd>⌘</kbd> + Scroll auf macOS;
- Zwei-Finger-Zoom auf dem Trackpad;
- Tastenkürzel aus der Tabelle.

Mit **Mit dem Mausrad zoomen** unter **Einstellungen → Editor** zoomt das Mausrad ohne Taste; <kbd>Shift</kbd> + Mausrad verschiebt weiterhin seitwärts. **Zoomrichtung umkehren** dreht die Richtung des Mausrads um, Trackpad-Gesten behalten ihre.

Gesten über den Ebenen- und Eigenschaften-Panels werden nicht an die Arbeitsfläche weitergegeben.

## Zoomwerkzeug

Halten Sie <kbd>Z</kbd> gedrückt und klicken Sie, um am Zeiger hineinzuzoomen, oder klicken Sie mit <kbd>Option</kbd>/<kbd>Alt</kbd>, um herauszuzoomen; ziehen Sie einen Bereich auf, um auf ihn zu zoomen. Beim Loslassen von <kbd>Z</kbd> kehrt das vorherige Werkzeug zurück. Ein kurzes Tippen auf <kbd>Z</kbd> lässt das Zoomwerkzeug aktiv; es steht auch im Menü des Handwerkzeugs in der Werkzeugleiste.

Zoom auf alles, auf die Auswahl und auf 100 %, die Stufen des Zoommenüs und der nächste oder vorherige Rahmen gleiten in ihre Ansicht, statt zu springen. Sie springen, wenn Animationen ausgeschaltet sind, der Ultralight-Modus aktiv ist oder das System reduzierte Bewegung verlangt.

## Lineale

Lineale sind ausgeblendet, bis Sie sie mit **Ansicht → Lineale** oder <kbd>Shift</kbd> + <kbd>R</kbd> einblenden.

## Ausrichten

Unter **Ansicht → Einstellungen** schalten Sie **An Geometrie ausrichten**, **An Objekten ausrichten** und **Am Pixelraster ausrichten** unabhängig voneinander ein. Die Einstellungen bleiben zwischen Sitzungen erhalten.

Geometrie- und Objekt-Ausrichten hilft, Vektorpunkte, verschobene Ebenen und vergrößerte Kanten an naher Geometrie, Objekten, Hilfslinien und Rahmenrändern auszurichten. Für diese Ziele erscheinen Ausrichtungslinien; die Pixel-Raster-Verrundung zeichnet nicht für jedes Pixel eine Ausrichtungslinie.

Mit eingeschaltetem **An Objekten ausrichten** richtet eine verschobene Ebene sich auch am gleichen Abstand aus: Sie zentriert sich zwischen ihren beiden Nachbarn oder landet so weit von einem Nachbarn entfernt, wie zwei andere Nachbarn derselben Reihe oder Spalte auseinanderliegen. Jeder Abstand dieser Größe zeigt einen rosa Indikator mit seiner Größe. Beim Vergrößern wird nicht auf Abstände ausgerichtet.

Mit eingeschaltetem **Am Pixelraster ausrichten** landen verschobene Ebenen, vergrößerte Kanten und gezeichnete Ebenen bei jeder Vergrößerung auf ganzen Pixeln, auch wenn sie zwischen Pixeln begannen. Ein Ausrichten an einem Objekt oder einer Hilfslinie gewinnt gegen das Raster. Pfeiltasten-Verschiebungen und im Eigenschaften-Panel getippte Werte behalten ihre Brüche.

Schalten Sie **An halben Pixeln ausrichten** unter **Einstellungen → Editor** ein, damit die Pixelraster-Ausrichtung auch auf halben Pixeln landen kann, sodass ein Strich von 1 px mittig auf einer Pixelkante sitzen kann. Ein Board behält sein Raster von 16 Einheiten.

Halten Sie während des Ziehens einer Ebene <kbd>Control</kbd> gedrückt, um das Objekt- und Pixel-Ausrichten vorübergehend zu umgehen — auch unter macOS, wo dies Control ist, nicht Command.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Ansicht verschieben | <kbd>Space</kbd> + Ziehen | <kbd>Space</kbd> + Ziehen |
| Handwerkzeug | <kbd>H</kbd> | <kbd>H</kbd> |
| Vergrößern | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Strg</kbd><kbd>+</kbd> |
| Verkleinern | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Strg</kbd><kbd>−</kbd> |
| 100 % | <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Strg</kbd><kbd>0</kbd> |
| Dokument einpassen | <kbd>⌘</kbd><kbd>1</kbd> | <kbd>Strg</kbd><kbd>1</kbd> |
| Auf Auswahl zoomen | <kbd>⌘</kbd><kbd>2</kbd> | <kbd>Strg</kbd><kbd>2</kbd> |

## Befehlspalette

<kbd>⌘</kbd><kbd>K</kbd> unter macOS beziehungsweise <kbd>Strg</kbd><kbd>K</kbd> unter Windows und Linux durchsucht Aktionen des Editors und der Anwendung. Ein Treffer wird mit Auswahl ausgeführt; nicht verfügbare Aktionen bleiben von der aktuellen Auswahl und dem Dokumentzustand abhängig.

Die Palette wechselt auch zwischen Seiten. Vor der Eingabe listet sie die in diesem Tab zuletzt besuchten Seiten, die neueste zuerst, und **Zu Seite wechseln…** öffnet eine Liste aller Seiten. Auch die Eingabe eines Seitennamens findet sie. Seiten, auf denen Mitarbeitende oder AI-Agenten arbeiten, nennen deren Namen; das Seiten-Panel markiert dieselben Seiten mit ihren Farben.
