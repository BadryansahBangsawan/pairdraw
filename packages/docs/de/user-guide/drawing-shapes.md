---
title: Formen zeichnen
description: Rechtecke, Ellipsen, Linien, Rahmen, Sektionen, Polygone und Sterne in Pairdraw erstellen.
---

# Formen zeichnen

Die Werkzeugleiste am linken Rand der Arbeitsfläche enthält Werkzeuge für Formen, Rahmen und Sektionen. Wählen Sie ein Werkzeug und klicken und ziehen Sie auf der Arbeitsfläche, um zu zeichnen.

## Werkzeuge

| Werkzeug | Taste | Beschreibung |
|----------|-------|----------|
| Rechteck | <kbd>R</kbd> | Zeichnet ein Rechteck |
| Ellipse | <kbd>O</kbd> | Zeichnet eine Ellipse |
| Linie | <kbd>L</kbd> | Zeichnet eine Linie |
| Rahmen | <kbd>F</kbd> oder <kbd>A</kbd> | Zeichnet einen Rahmen (Container für andere Objekte) |
| Abschnitt | <kbd>Shift</kbd> + <kbd>S</kbd> | Zeichnet eine Sektion (übernimmt die Geschwister, die sie vollständig abdeckt) |

## Bilder platzieren

Wählen Sie **Datei › Bild platzieren…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, unter Windows und Linux <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>K</kbd>) oder klicken Sie auf die Bild-Schaltfläche in der Werkzeugleiste und wählen Sie PNG-, JPEG-, WebP-, GIF-, AVIF- oder SVG-Dateien. Sie erscheinen ausgewählt in der Mitte der Ansicht, als ein Schritt, der sich rückgängig machen lässt; SVG wird zu bearbeitbaren Ebenen.

Das Werkzeug **Haftnotiz** steht in der Werkzeugleiste nach Text. Es hat keine Taste, sodass <kbd>N</kbd> weiterhin zum nächsten Rahmen zoomt.

## Formenmenü

Das Formenmenü (aus der Werkzeugleiste erreichbar) enthält weitere Formen:

- **Polygon:** erstellt standardmäßig ein Polygon mit 3 Seiten (Dreieck).
- **Stern:** erstellt einen fünfzackigen Stern mit einem Innenradius von 0,38.

Polygon und Stern haben kein Tastenkürzel; Sie erreichen sie über das Formenmenü in der Werkzeugleiste.

## Werkzeugleiste anpassen

Klicken Sie mit der rechten Maustaste auf die Werkzeugleiste und wählen Sie **Werkzeugleiste anpassen…**, oder öffnen Sie **Einstellungen → Editor**, um sie zu ändern:

- Schalten Sie den Schalter eines Werkzeugs aus, um es auszublenden. Ausgeblendete Werkzeuge behalten ihre Tastenkürzel. **Verschieben** wird immer angezeigt.
- Ziehen Sie ein Werkzeug, um es neu einzuordnen. In einem Kasten abgelegt, wird es Teil dieses Menüs; in der Lücke zwischen Kästen abgelegt, wird es eine eigene Schaltfläche; auf einem anderen Werkzeug abgelegt, teilen sich beide ein Menü.
- Das Menü **⋯** eines Werkzeugs verschiebt es nach oben oder unten, gruppiert es mit dem Werkzeug darüber oder löst es aus seinem Menü. Auch sein Griff verschiebt es mit <kbd>↑</kbd> und <kbd>↓</kbd>.
- **Symbol einfügen** führt einen Befehl aus, statt ein Werkzeug zu wählen; es lässt sich daher verschieben und ausblenden, aber keinem Menü hinzufügen.

**Auf Standard zurücksetzen** stellt die ursprüngliche Anordnung wieder her. Werkzeuge aus späteren Versionen kommen in ihr Standardmenü, sodass auch eine angepasste Werkzeugleiste sie erhält.

## Proportionen beibehalten

Halten Sie beim Ziehen <kbd>Shift</kbd>, um die Form einzuschränken:

- Rechteck → Quadrat (gleiche Breite und Höhe)
- Ellipse → Kreis
- Linie → rastet bei 0°, 45° und 90° ein

## Eigenschaften von Formen

Nach dem Zeichnen wählen Sie eine Form aus, um ihre Eigenschaften in der Registerkarte „Design“ des Eigenschaften-Panels zu bearbeiten.

### Füllung

Jede Form kann eine Füllung haben. Der Bereich „Füllung“ unterstützt:

- **Volltonfarbe:** über den HSV-Farbwähler auswählen oder einen Hex-Wert eingeben.
- **Verlauf:** linear, radial, Winkel oder Diamant mit bearbeitbaren Farbstopps. Solange die Auswahl des Verlaufs geöffnet ist, zeigt die Arbeitsfläche seine Griffe: Ziehen Sie ein Ende oder einen Radiuspunkt, um ihn zu verschieben, halten Sie <kbd>Shift</kbd>, um in 15°-Schritten zu drehen, und ziehen Sie das Quadrat eines Farbstopps, um ihn entlang der Linie zu verschieben.
- **Netz:** ein Raster farbiger Punkte, das über die Ebene ineinander übergeht. Der Netz-Reiter zeigt jeden Punkt: Wählen Sie einen zum Umfärben aus oder ändern Sie **Spalten** und **Zeilen**, um das Raster neu abzutasten (jeweils bis zu 4). Netze malen auf Füllungen und Konturen; `.fig`-Dateien behalten das Raster und zeigen anderswo dessen eigene Farbe, und `mesh_gradient`-Farben aus `.pen` werden importiert.
- **Bild:** Wählen Sie eine Bilddatei als Füllung oder fügen Sie eine Adresse in **Bild-URL** ein und wählen Sie **Laden**, um ein PNG-, JPEG-, GIF- oder WebP-Bild aus dem Web (oder eine `data:`-URL) mit bis zu 64 MB zu laden.
- **Shader:** ein animierter GLSL-Shader: Beginnen Sie mit der Galerie in der Shader-Füllungsauswahl, fügen Sie Effekte hinzu oder fügen Sie ein von shaders.com kopiertes Preset ein.

Eine Bildfüllung wird in einem von fünf Modi platziert: **Füllen** deckt die Ebene ab und beschneidet das Bild, **Einpassen** zeigt das ganze Bild innerhalb der Ebene, **Strecken** streckt das ganze Bild auf die Proportionen der Ebene, **Zuschneiden** lässt Sie den sichtbaren Bildausschnitt wählen, und **Kacheln** wiederholt das Bild. „Strecken“ wird als Zuschnitt des ganzen Bildes gespeichert, so wie `.pen`-Dateien es speichern und Figma es liest.

Ein Bild schneiden Sie direkt auf der Arbeitsfläche zu oder richten es neu aus, indem Sie die Ebene doppelt anklicken, sie auswählen und <kbd>Enter</kbd> drücken oder **Bild zuschneiden** im Kontextmenü oder in der Bildfüllung wählen. Das ganze Bild erscheint, außerhalb der Ebene abgeblendet. Ziehen Sie die Eckwinkel oder Kantenbalken der Ebene, um sie über dem stillstehenden Bild zuzuschneiden, ziehen Sie das Bild, um es hinter der Ebene zu verschieben, und ziehen Sie seine Eckpunkte, um es zu skalieren. <kbd>Shift</kbd> hält die Proportionen oder eine Achse, <kbd>Alt</kbd> arbeitet von der Mitte aus. Jedes Ziehen ist ein Schritt zum Rückgängigmachen und speichert die Füllung als Zuschnitt; <kbd>Enter</kbd>, <kbd>Esc</kbd>, ein Doppelklick oder ein Klick außerhalb des Bildes beendet den Modus. Vektoren, Ebenen mit Kindern und Ebenen, die Auto-Layout platziert, behalten ihre Kanten; bei ihnen können Sie das Bild nur verschieben und skalieren.

### Shader-Modus

Der Shader-Modus zeigt eine Shader-Füllung einzeln und groß, mit Wiedergabe und Pause, einem Phasenregler und den Einstellungen des Shaders daneben. Öffnen Sie ihn mit **Im Shader-Modus öffnen** in der Shader-Füllungsauswahl oder über **Ansicht → Shader-Modus**, wenn die Auswahl eine Shader-Füllung hat.

### Kontur

Fügen Sie jeder Form einen Umriss hinzu. Zu den Kontureigenschaften gehören:

- **Stärke:** einheitlich oder pro Seite (oben, rechts, unten, links) über das Auswahlmenü der Seiten.
- **Farbe:** Volltonfarbe mit Deckkraft.
- **Ausrichtung:** innen, mittig oder außen an der Formgrenze (das Rendering per Beschnitt entspricht dem Verhalten von Figma).
- **Enden:** keine, rund, quadratisch, Linienpfeil, Dreieckspfeil (für offene Pfade).
- **Verbindungen:** Gehrung, abgeschrägt, rund.
- **Strichelung:** Strich und Lücke.

### Eckenradius

Verfügbar für Rechtecke, Rahmen, Komponenten, Instanzen, Polygone und Sterne. Klicken Sie auf den Schalter für unabhängige Ecken, um jede Ecke (oben links, oben rechts, unten links, unten rechts) einzeln festzulegen; die Ecken eines Polygons oder Sterns teilen sich einen Radius, der auch die inneren Ecken abrundet.

Fahren Sie auf der Arbeitsfläche über ein ausgewähltes Rechteck, erscheint in jeder Ecke ein Griff; ziehen Sie einen, um die Ecken abzurunden. Gleiche Ecken ändern sich gemeinsam, unterschiedliche einzeln; halten Sie <kbd>⌥</kbd>, um das umzukehren, und <kbd>⇧</kbd>, um auf Zehner zu runden. Ein Polygon oder Stern hat einen Radiusgriff unterhalb seiner oberen Spitze, der alle Ecken abrundet; ziehen Sie den Griff an der nächsten Spitze um die Mitte, um die Anzahl der Spitzen zu ändern, und beim Stern den Griff an der ersten inneren Spitze zur Mitte hin oder von ihr weg, um sein Verhältnis zu ändern. Die Griffe sind ausgeblendet, solange die Form auf dem Bildschirm weniger als 108 Pixel misst; zoomen Sie hinein, um sie zu erreichen.

### Ellipsenbögen

Wählen Sie eine Ellipse aus, um ihren Bogen im Bereich „Darstellung“ zu sehen: **Start** ist der Winkel, an dem der Bogen beginnt, in Grad; **Sweep** gibt an, wie viel der vollen Umdrehung er abdeckt, in Prozent; und **Ratio** ist die Größe des Lochs in der Mitte als Prozentsatz der Ellipse, für Ringe und Donut-Diagramme. Geben Sie einen Wert ein oder ziehen Sie am Feld; die Griffe der Ellipse auf der Arbeitsfläche ändern dieselben drei Werte.

### Effekte

Fügen Sie im Bereich „Effekte“ visuelle Effekte hinzu:

- **Schlagschatten:** Versatz, Unschärferadius, Ausbreitung, Farbe.
- **Innerer Schatten:** dieselben Einstellungen, innerhalb der Form gerendert.
- **Ebenenunschärfe:** macht das gesamte Objekt unscharf.
- **Hintergrundunschärfe:** macht den Inhalt hinter dem Objekt unscharf.
- **Vordergrund-Weichzeichnung:** macht den Inhalt davor unscharf.

Klicken Sie auf **+**, um einen Effekt hinzuzufügen. Jede Effektzeile lässt sich mit ihren Einstellungen aufklappen. Mit dem Augensymbol schalten Sie einen Effekt ein oder aus.

## Rahmen und Sektionen

**Rahmen** sind Container. Ziehen Sie Formen in einen Rahmen, um sie unterzuordnen, oder beginnen Sie, in einem Rahmen zu zeichnen: Eine neue Form kommt in den Rahmen unter dem Startpunkt, außer bei gesperrten Rahmen, und wird am Ende eines Auto-Layout-Verlaufs angefügt. Zeichnen Sie einen Rahmen über vorhandene Objekte, legt er die nicht gesperrten, die er vollständig abdeckt, in sich hinein. Neue Rahmen beschneiden ihren Inhalt wie in Figma (schalten Sie **Inhalt zuschneiden** aus, damit Kinder auch außerhalb sichtbar sind), und Rahmen unterstützen [Auto-Layout](./auto-layout).

Wählen Sie das Rahmenwerkzeug, um im Design-Panel aufklappbare Vorlagen für Smartphones, Tablets, Desktops, Präsentationen, Uhren, Papier, soziale Medien, Figma-Community-Assets und archivierte Geräte zu durchsuchen. Eine Vorlage erstellt einen benannten Rahmen in der Mitte der Ansicht und kehrt zum Auswahlwerkzeug zurück. Ist ein vorhandener Rahmen ausgewählt, ändern Sie mit seinem Auswahlmenü **Frame-Voreinstellung** die Größe, ohne den Namen zu ändern.

**Sektionen** (Werkzeug **Abschnitt**) sind Container der obersten Ebene, die beim Zeichnen, Verschieben oder Vergrößern die Geschwisterobjekte übernehmen, die sie vollständig abdecken. Sie helfen, große Arbeitsflächen in logische Bereiche zu gliedern. Sektionen zeigen ein Titeletikett, das Sie ziehen können.

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-----|-----------------|
| Rechteckwerkzeug | <kbd>R</kbd> | <kbd>R</kbd> |
| Ellipsenwerkzeug | <kbd>O</kbd> | <kbd>O</kbd> |
| Linienwerkzeug | <kbd>L</kbd> | <kbd>L</kbd> |
| Rahmenwerkzeug | <kbd>F</kbd> oder <kbd>A</kbd> | <kbd>F</kbd> oder <kbd>A</kbd> |
| Abschnittswerkzeug | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Auf Quadrat/Kreis einschränken | <kbd>Shift</kbd> + Ziehen | <kbd>Shift</kbd> + Ziehen |

## Tipps

- Sektionen gibt es nur auf der obersten Ebene; sie lassen sich nicht in Rahmen verschachteln.
- Rahmen mit [Auto-Layout](./auto-layout) eignen sich für anpassungsfähige Layouts.
- [Exportieren](./exporting) Sie einzelne Formen oder Gruppen über das Eigenschaften-Panel oder das Kontextmenü als Bilder.
