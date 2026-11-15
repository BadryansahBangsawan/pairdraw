---
title: Dateien untersuchen
description: Objektbäume durchsuchen, nach Name oder Typ suchen und Eigenschaften im Terminal untersuchen.
---

# Dateien untersuchen

Mit der CLI erkunden Sie Designdokumente, ohne den Editor zu öffnen. Jeder Befehl funktioniert auch mit der laufenden App: Lassen Sie dazu einfach das Dateiargument weg.

::: tip Installation

```sh
npm install -g @pairdraw/cli
# oder
bun add -g @pairdraw/cli
```

:::

## Dokumentinformationen

Ein schneller Überblick über Seitenzahl, Gesamtzahl der Objekte, verwendete Schriften und Dateigröße:

```sh
pairdraw info design.fig
```

## Schriftdiagnose {#font-diagnostics}

Meldet angeforderte Schriftschnitte, verfügbare Quellen, Ersetzungen und betroffene Ebenen:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

Im Dateimodus werden alle Seiten des Dokuments mit den auf dem CLI-Host verfügbaren Schriften geprüft, ohne Online-Schriften herunterzuladen. Mit der laufenden App wird das angesprochene Dokument bzw. die angesprochene Seite gemeldet, deren geladene Schriften von denen des CLI-Hosts abweichen können. Schnitte werden als `available`, `substituted` oder `unresolved` gemeldet; die JSON-Ausgabe enthält `faithful`, `faces` und `issues`.

Mit den [Regeln zur Schriftersetzung beim Export](./exporting#font-substitution-policy) warnen Sie bei dateibasierten Raster- und PDF-Exporten vor Ersetzungen oder lehnen sie ab.

## Objektbaum

Die vollständige Objekthierarchie ausgeben:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Objekte finden

Nach Typ suchen:

```sh
pairdraw find design.fig --type TEXT
```

Nach Name suchen:

```sh
pairdraw find design.fig --name "Button"
```

Beide Optionen lassen sich kombinieren, um die Ergebnisse weiter einzugrenzen.

## Abfragen mit XPath

Mit XPath-Selektoren finden Sie Objekte nach Typ, Attributen und Baumstruktur:

```sh
pairdraw query design.fig "//FRAME"
```

### Nützliche Muster

**Nach Typ:**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**Nach Attributen:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**Nach Name und Textinhalt:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**Nach Hierarchie:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Abfragbare Attribute

Die Attributnamen entsprechen der API und bleiben unverändert:

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Beispielausgabe

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Objektdetails

Alle Eigenschaften eines bestimmten Objekts anhand seiner ID untersuchen:

```sh
pairdraw node design.fig --id 1:23
```

## Seiten

Alle Seiten des Dokuments auflisten:

```sh
pairdraw pages design.fig
```

## Variablen

Designvariablen und ihre Sammlungen auflisten:

```sh
pairdraw variables design.fig
```

## Laufende App

Läuft die Desktop-App, lassen Sie das Dateiargument weg: Die CLI verbindet sich über RPC und arbeitet mit der geöffneten Arbeitsfläche:

```sh
pairdraw documents list    # IDs der geöffneten Dokumente und Seiten auflisten
pairdraw tree              # das aktive Dokument untersuchen
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

Rufen Sie in Agenten-Abläufen zuerst `pairdraw documents list --json` auf und übergeben Sie anschließend `--document-id` und `--page-id` ausdrücklich, statt sich auf den sichtbaren aktiven Tab bzw. die sichtbare Seite zu verlassen. Dokumente öffnen, speichern, wechseln und schließen, Rückgängig machen, Einstellungen ändern und beliebige Editor-Werkzeuge aufrufen: siehe [Controlling the App](/programmable/cli/app-control).

## Designs prüfen

Dokumente auf Probleme bei Benennung, Layout, Struktur und Barrierefreiheit prüfen:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

`--json` liefert maschinenlesbare Ausgabe; jede Meldung enthält ihre `fix`- und `suggestions`-Angaben als Daten. `--fix` wendet die sicheren Korrekturen an – Farben werden an die passende Farbvariable gebunden und die Geometrie auf ganze Pixel gerundet – und schreibt das Ergebnis in die mit `-o` angegebene `.fig`-Datei.

## JSON-Ausgabe

Alle Befehle unterstützen `--json` für maschinenlesbare Ausgabe. Leiten Sie sie an `jq` weiter, verwenden Sie sie in CI-Skripten oder verarbeiten Sie sie mit anderen Werkzeugen:

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```
