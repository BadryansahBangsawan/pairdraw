---
title: Navigation auf der Arbeitsfläche
description: Ansicht verschieben, zoomen, Hilfslinien, Ausrichten und Abstandsmessungen in Pairdraw.
---

# Navigation auf der Arbeitsfläche

Die Arbeitsfläche ist unbegrenzt. Verschieben und vergrößern Sie die Ansicht frei, um sich in Ihrem Design zu bewegen.

## Ansicht verschieben

Verschiebt den sichtbaren Bereich der Arbeitsfläche, ohne Objekte zu verändern.

- <kbd>Space</kbd> + Ziehen: <kbd>Space</kbd> gedrückt halten und irgendwo auf der Arbeitsfläche ziehen.
- **Mittlere Maustaste:** mit gedrückter mittlerer Maustaste ziehen.
- **Zwei Finger auf dem Trackpad:** mit zwei Fingern wischen.
- <kbd>Shift</kbd> + Mausrad: horizontal verschieben.

## Handwerkzeug

<kbd>H</kbd> aktiviert das Handwerkzeug zum fortlaufenden Verschieben. Solange es aktiv ist, verschiebt jedes Ziehen die Ansicht, ohne dass <kbd>Space</kbd> gedrückt werden muss. Mit einem anderen Werkzeug (zum Beispiel <kbd>V</kbd> für das Auswahlwerkzeug) beenden Sie es.

## Zoom

Der Zoom richtet sich nach der Position des Mauszeigers:

- <kbd>Strg</kbd> + Scrollen (auf dem Mac <kbd>⌘</kbd> + Scrollen): nach oben scrollen vergrößert, nach unten verkleinert.
- **Zwei-Finger-Zoom** auf dem Trackpad.
- **Tastenkürzel:** siehe Tabelle unten.

Für eine Maus schalten Sie **Mit dem Mausrad zoomen** unter **Einstellungen → Editor → Navigation** ein, um nur mit dem Rad zu zoomen; <kbd>Shift</kbd> + Mausrad verschiebt weiterhin seitwärts. **Zoomrichtung umkehren** dreht die Zoomrichtung des Mausrads um, während der Zwei-Finger-Zoom auf dem Trackpad seine eigene Richtung behält.

Zwei-Finger-Zoom über den Panels (Ebenen, Eigenschaften) wird unterbunden, damit er nicht versehentlich den Zoom des Browsers ändert.

## Zoomwerkzeug

Halten Sie <kbd>Z</kbd> gedrückt und klicken Sie, um am Zeiger hineinzuzoomen, oder klicken Sie mit <kbd>Option</kbd>/<kbd>Alt</kbd>, um herauszuzoomen; ziehen Sie einen Bereich auf, um auf ihn zu zoomen. Beim Loslassen von <kbd>Z</kbd> kehrt das vorherige Werkzeug zurück. Ein kurzes Tippen auf <kbd>Z</kbd> lässt das Zoomwerkzeug aktiv; es steht auch im Menü des Handwerkzeugs in der Werkzeugleiste.

Zoom auf alles, auf die Auswahl und auf 100 %, die Stufen des Zoommenüs und der nächste oder vorherige Rahmen gleiten in ihre Ansicht, statt zu springen. Sie springen, wenn Animationen ausgeschaltet sind, der Ultralight-Modus aktiv ist oder das System reduzierte Bewegung verlangt.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Ansicht verschieben | <kbd>Space</kbd> + Ziehen | <kbd>Space</kbd> + Ziehen |
| Handwerkzeug | <kbd>H</kbd> | <kbd>H</kbd> |
| Zoomwerkzeug | <kbd>Z</kbd> | <kbd>Z</kbd> |
| Vergrößern | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Strg</kbd> + <kbd>+</kbd> |
| Verkleinern | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Strg</kbd> + <kbd>−</kbd> |
| Vergrößern / Verkleinern | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Zoom auf 100 % | <kbd>⇧</kbd><kbd>0</kbd> oder <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> oder <kbd>Strg</kbd> + <kbd>0</kbd> |
| Alles einpassen | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Auf Auswahl zoomen | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Auf nächsten / vorherigen Rahmen zoomen | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Nächste / vorherige Seite | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Pixelraster | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Am Pixelraster ausrichten | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>'</kbd> |
| Lineale | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Multiplayer-Cursor | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Strg</kbd> + <kbd>\\</kbd> |

## Rahmen und Seiten

<kbd>N</kbd> wählt den nächsten Rahmen der obersten Ebene auf der Seite aus und zoomt auf ihn; <kbd>Shift</kbd> + <kbd>N</kbd> geht zurück. Rahmen in Sektionen zählen mit, ausgeblendete nicht. Die Reihenfolge läuft von links nach rechts, dann von oben nach unten, und beginnt an den Enden von vorn. Ist eine Ebene innerhalb eines Rahmens ausgewählt, beginnt der Schritt bei diesem Rahmen.

<kbd>Page Down</kbd> und <kbd>Page Up</kbd> öffnen die nächste und vorherige Seite in der Reihenfolge des Seiten-Panels.

## Pixelraster

Ist so weit hineingezoomt, dass ein Dokumentpixel acht Bildschirmpixel abdeckt (800 % auf einem Standarddisplay, 400 % auf einem Retina-Display), zeigt die Arbeitsfläche wie Figma an jedem Pixel eine Linie. Ein- und ausschalten lässt es sich mit **Ansicht → Pixelraster**, <kbd>Shift</kbd> + <kbd>'</kbd> oder **Pixelraster anzeigen** unter **Einstellungen → Editor**; die Wahl gilt für alle geöffneten Dokumente und bleibt zwischen Sitzungen erhalten.

## Seitenleisten {#side-panels}

Der Schalter des Ebenen-Panels sitzt über den Werkzeugen am linken Rand der Arbeitsfläche, der Schalter des Eigenschaften-Panels in der oberen Leiste. Das Eigenschaften-Panel erscheint, wenn Sie eine Ebene auswählen, und verschwindet mit der Auswahl; ein Panel, das Sie über seinen Schalter öffnen, bleibt offen, bis Sie es schließen, auch über Sitzungen hinweg. Die Arbeitsfläche nimmt den Platz eines geschlossenen Panels ein, das sich in seiner vorherigen Breite wieder öffnet. **Ansicht → Ebenenbereich** und **Ansicht → Eigenschaftenbereich** bewirken dasselbe. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Strg</kbd> + <kbd>\\</kbd>) blendet weiterhin alle Panels auf einmal aus. Die Kommentarliste und der Versionsverlauf erscheinen im Eigenschaften-Panel; das Kommentarwerkzeug und der Versionsverlauf öffnen es daher, solange Sie sie verwenden, und schließen es danach wieder.

## Ultralight-Modus

Auf einem langsamen oder akkubetriebenen Computer schalten Sie **Ultralight-Modus** unter **Einstellungen → Editor → Darstellung** ein. Er schaltet Animationen der Oberfläche sofort aus und rendert die Arbeitsfläche nach einem Neuladen in Kacheln mit einem Gerätepixel pro Bildschirmpixel, lässt Hintergrundunschärfe und Rauschen weg und zeichnet Schatten beim Hineinzoomen mit geringerer Auflösung. Progressives Rendering bleibt an, solange der Ultralight-Modus an ist. Exportierte Bilder behalten alle Effekte.

## Lineale und Hilfslinien

Lineale sind ausgeblendet, bis Sie sie mit **Ansicht → Lineale** oder <kbd>Shift</kbd> + <kbd>R</kbd> einblenden. Ziehen Sie dann aus dem oberen Lineal eine horizontale oder aus dem linken Lineal eine vertikale Hilfslinie. Legen Sie sie auf der Seite ab, entsteht eine Hilfslinie der Arbeitsfläche; legen Sie sie auf einem Rahmen ab, eine Hilfslinie in den Koordinaten dieses Rahmens.

- Klicken Sie auf eine Hilfslinie, um sie auszuwählen; ziehen Sie sie, um sie neu zu positionieren oder zwischen der Seite und einem Rahmen zu übertragen.
- Halten Sie beim Ziehen einer vorhandenen Hilfslinie <kbd>Option</kbd> / <kbd>Alt</kbd>, um sie zu duplizieren.
- Ziehen Sie eine Hilfslinie zurück auf ein Lineal, um sie zu entfernen, oder wählen Sie in ihrem Kontextmenü **Hilfslinie entfernen**.
- Änderungen an Hilfslinien lassen sich rückgängig machen und wiederholen und bleiben in `.fig`-Dateien erhalten.

## Ausrichten

Unter **Ansicht → Einstellungen** schalten Sie **An Geometrie ausrichten**, **An Objekten ausrichten** und **Am Pixelraster ausrichten** unabhängig voneinander ein. Die Einstellungen bleiben zwischen Sitzungen erhalten.

Geometrie- und Objekt-Ausrichten hilft, Vektorpunkte, verschobene Ebenen und vergrößerte Kanten an naher Geometrie, Objekten, Hilfslinien und Rahmenrändern auszurichten. Für diese Ziele erscheinen Ausrichtungslinien; die Pixelraster-Rundung zeichnet nicht für jedes Pixel eine Ausrichtungslinie.

Mit eingeschaltetem **An Objekten ausrichten** richtet eine verschobene Ebene sich auch am gleichen Abstand aus: Sie zentriert sich zwischen ihren beiden Nachbarn oder landet so weit von einem Nachbarn entfernt, wie zwei andere Nachbarn derselben Reihe oder Spalte auseinanderliegen. Jeder Abstand dieser Größe zeigt einen rosa Indikator mit seiner Größe. Beim Vergrößern wird nicht auf Abstände ausgerichtet.

Mit eingeschaltetem **Am Pixelraster ausrichten** landen verschobene Ebenen, vergrößerte Kanten und gezeichnete Ebenen bei jeder Vergrößerung auf ganzen Pixeln, auch wenn sie zwischen Pixeln begannen. Ein Ausrichten an einem Objekt oder einer Hilfslinie gewinnt gegen das Raster. Pfeiltasten-Verschiebungen und im Eigenschaften-Panel getippte Werte behalten ihre Nachkommastellen.

Schalten Sie **An halben Pixeln ausrichten** unter **Einstellungen → Editor** ein, damit die Pixelraster-Ausrichtung auch auf halben Pixeln landen kann, sodass eine Kontur von 1 px mittig auf einer Pixelkante sitzen kann. Ein Board behält sein Raster von 16 Einheiten.

Halten Sie während des Ziehens einer Ebene <kbd>Control</kbd> gedrückt, um das Objekt- und Pixel-Ausrichten vorübergehend zu umgehen — auch unter macOS, wo dies Control ist, nicht Command.

## Abstandsmessung

Wählen Sie eine Ebene aus, halten Sie <kbd>Option</kbd> unter macOS oder <kbd>Alt</kbd> unter Windows/Linux und fahren Sie über eine andere Ebene, um vorübergehend die Abstände zu sehen. Lassen Sie die Taste los, verschwindet die Anzeige; sie fügt keine Hilfslinien hinzu und verändert das Dokument nicht.

## Befehlspalette

<kbd>⌘</kbd><kbd>K</kbd> unter macOS beziehungsweise <kbd>Strg</kbd> + <kbd>K</kbd> unter Windows und Linux durchsucht Aktionen des Editors und der Anwendung. Ein Treffer wird mit Auswahl ausgeführt; nicht verfügbare Aktionen bleiben von der aktuellen Auswahl und dem Dokumentzustand abhängig.

Die Palette wechselt auch zwischen Seiten. Vor der Eingabe listet sie die in diesem Tab zuletzt besuchten Seiten, die neueste zuerst, und **Zu Seite wechseln…** öffnet eine Liste aller Seiten. Auch die Eingabe eines Seitennamens findet sie. Seiten, auf denen Mitarbeitende oder AI-Agenten arbeiten, nennen deren Namen; das Seiten-Panel markiert dieselben Seiten mit ihren Farben.

## Tipps

- Der Zoom zielt immer auf die Position des Mauszeigers; zeigen Sie also auf das, was Sie näher sehen möchten.
- Das Handwerkzeug lohnt sich, wenn Sie oft verschieben müssen: Es bleibt aktiv, bis Sie das Werkzeug wechseln.
- Wie Sie mit Objekten auf der Arbeitsfläche arbeiten, beschreibt [Auswählen und Bearbeiten](./selection-and-manipulation).
