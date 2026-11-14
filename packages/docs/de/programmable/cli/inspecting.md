---
title: Dateien untersuchen
description: Dokumentbaum, Objekte, Seiten und Variablen über die CLI lesen.
---

# Dateien untersuchen

Die CLI liest `.fig`-Dateien, ohne den Editor zu öffnen. Läuft die Desktop-App, kann der Dateiname entfallen; die CLI verwendet dann RPC für das geöffnete Dokument.

::: tip Installation

```sh
npm install -g @pairdraw/cli
# oder
bun add -g @pairdraw/cli
```

:::

## Dokumentinformationen

```sh
pairdraw info design.fig
```

Zeigt Seiten, Objektanzahl, verwendete Schriften und Dateigröße.

## Dokumentbaum und Suche

```sh
pairdraw tree design.fig
pairdraw find design.fig --type TEXT
pairdraw find design.fig --name "Button"
```

## XPath-Abfragen

```sh
pairdraw query design.fig "//FRAME"
pairdraw query design.fig "//TEXT[@fontSize >= 24]"
pairdraw query design.fig "//*[@visible = false]"
```

Attributnamen wie `fontSize`, `layoutMode` und `strokeWeight` entsprechen der API und bleiben unverändert.

## Objekte, Seiten und Variablen

```sh
pairdraw node design.fig --id 1:23
pairdraw pages design.fig
pairdraw variables design.fig
```

## Geöffnetes Dokument

```sh
pairdraw documents list
pairdraw tree --document-id tab-123 --page-id 0:1
```

Für automatisierte Abläufe zuerst `pairdraw documents list --json` aufrufen und anschließend `--document-id` und `--page-id` ausdrücklich übergeben. Dokumente öffnen, speichern, wechseln und schließen, Rückgängig machen, Einstellungen ändern und beliebige Editor-Werkzeuge aufrufen: siehe [Controlling the App](/programmable/cli/app-control).

## Qualitätsprüfung

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --fix -o fixed.fig
```

Alle Befehle unterstützen `--json`; jede Meldung enthält ihre `fix`- und `suggestions`-Angaben als Daten. `--fix` wendet die sicheren Korrekturen an – Farben werden an die passende Farbvariable gebunden und die Geometrie auf ganze Pixel gerundet – und schreibt das Ergebnis in die mit `-o` angegebene `.fig`-Datei.
