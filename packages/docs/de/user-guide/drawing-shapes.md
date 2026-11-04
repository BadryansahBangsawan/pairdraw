---
title: Formen zeichnen
description: Rechtecke, Ellipsen, Linien, Rahmen, Sektionen, Polygone und Sterne erstellen.
---

# Formen zeichnen

Die untere Werkzeugleiste enthält Werkzeuge für Formen, Rahmen und Sektionen. Wählen Sie ein Werkzeug und ziehen Sie auf der Arbeitsfläche.

## Werkzeuge

| Werkzeug | Taste | Ergebnis |
|----------|-------|----------|
| Rechteck | <kbd>R</kbd> | Rechteck |
| Ellipse | <kbd>O</kbd> | Ellipse |
| Linie | <kbd>L</kbd> | Linie |
| Rahmen | <kbd>F</kbd> | Container für andere Objekte |
| Sektion | <kbd>Shift</kbd> + <kbd>S</kbd> | Container der obersten Ebene |

Polygon und Stern befinden sich im Formenmenü.

## Bilder platzieren

**Datei › Bild platzieren…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, unter Windows und Linux <kbd>Shift</kbd> + <kbd>Strg</kbd> + <kbd>K</kbd>) oder die Bild-Schaltfläche in der Werkzeugleiste öffnet eine Auswahl für PNG-, JPEG-, WebP-, GIF-, AVIF- und SVG-Dateien. Sie erscheinen ausgewählt in der Mitte der Ansicht, als ein Schritt, der sich rückgängig machen lässt; SVG wird zu bearbeitbaren Ebenen.

Das Werkzeug **Haftnotiz** steht in der Werkzeugleiste nach Text. Es hat keine Taste, sodass <kbd>N</kbd> weiterhin zum nächsten Rahmen zoomt.

## Proportionen beibehalten

Mit <kbd>Shift</kbd> wird ein Rechteck zum Quadrat, eine Ellipse zum Kreis und eine Linie rastet bei 0°, 45° und 90° ein.

## Eigenschaften

### Füllung

Volltonfarbe, linearer, radialer, Winkel- oder Diamantverlauf sowie Bildfüllung. Eine Shader-Füllung ist ein animierter GLSL-Shader: Beginnen Sie mit der Galerie in der Shader-Füllungsauswahl, fügen Sie Effekte hinzu oder fügen Sie ein von shaders.com kopiertes Preset ein.

Ein Bild schneiden Sie direkt auf der Arbeitsfläche zu, indem Sie die Ebene doppelt anklicken, sie auswählen und <kbd>Enter</kbd> drücken oder **Bild zuschneiden** im Kontextmenü oder in der Bildfüllung wählen. Das ganze Bild erscheint, außerhalb der Ebene abgeblendet. Ziehen Sie die Eckwinkel oder Kantenbalken der Ebene, um sie über dem stillstehenden Bild zuzuschneiden, ziehen Sie das Bild, um es hinter der Ebene zu verschieben, und ziehen Sie seine Eckpunkte, um es zu skalieren. <kbd>Shift</kbd> hält die Proportionen oder eine Achse, <kbd>Alt</kbd> arbeitet von der Mitte aus. Jedes Ziehen ist ein Schritt zum Rückgängigmachen; <kbd>Enter</kbd>, <kbd>Esc</kbd>, ein Doppelklick oder ein Klick außerhalb des Bildes beendet den Modus. Vektoren, Ebenen mit Inhalt und Ebenen, die Auto-Layout platziert, behalten ihre Kanten; bei ihnen können Sie das Bild nur verschieben und skalieren.

### Shader-Modus

Der Shader-Modus zeigt eine Shader-Füllung einzeln und groß, mit Wiedergabe und Pause, einem Phasenregler und den Einstellungen des Shaders daneben. Öffnen Sie ihn mit **Im Shader-Modus öffnen** in der Shader-Füllungsauswahl oder über **Ansicht → Shader-Modus**, wenn die Auswahl eine Shader-Füllung hat.

### Kontur

Gemeinsame oder seitenspezifische Stärke, Farbe, Ausrichtung innen/mittig/außen, Enden, Verbindungen und Strichelung.

### Eckenradius

Ein gemeinsamer oder separater Radius ist für Rechtecke, Rahmen, Komponenten und Instanzen verfügbar.

### Effekte

Schlagschatten, innerer Schatten sowie Ebenen-, Hintergrund- und Vordergrundunschärfe.

## Rahmen und Sektionen

Ein Rahmen ist ein Container. Hineingezogene Objekte werden untergeordnet. Das Beschneiden ist standardmäßig ausgeschaltet. Rahmen unterstützen [automatische Anordnung](./auto-layout).

Eine Sektion ist ein Container der obersten Ebene und übernimmt beim Zeichnen überlappende Nachbarobjekte.
