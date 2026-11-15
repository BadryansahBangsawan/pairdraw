---
title: Designs analysieren
description: Farben, Typografie, Abstände und wiederkehrende Strukturen in `.fig`-Dateien untersuchen.
---

# Designs analysieren

Die `analyze`-Befehle prüfen ein ganzes Designsystem im Terminal: Sie finden Unstimmigkeiten, ermitteln die tatsächlich verwendete Farbpalette und zeigen Strukturen, die sich als Komponenten herauslösen ließen.

## Farben

```sh
pairdraw analyze colors design.fig
```

Findet jede Farbe in der Datei, zählt ihre Verwendung und zeigt ein Histogramm:

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Typografie

```sh
pairdraw analyze typography design.fig
```

Listet jede Kombination aus Schriftfamilie, Größe und Schnitt mit ihrer Häufigkeit auf. So fallen einmalig verwendete Textstile auf, die zusammengeführt werden sollten.

## Abstände

```sh
pairdraw analyze spacing design.fig
```

Prüft Abstände und Innenabstände in Rahmen mit automatischer Anordnung. So werden Unstimmigkeiten in der Abstandsskala sichtbar, beispielsweise ein einzelner Abstand von `13px` zwischen sonst üblichen `8/16/24`.

## Wiederkehrende Strukturen

```sh
pairdraw analyze clusters design.fig
```

Sucht wiederkehrende Objektstrukturen, die als Komponenten herausgelöst werden könnten:

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## JSON-Ausgabe

Alle Analysebefehle unterstützen `--json` für maschinenlesbare Ausgabe:

```sh
pairdraw analyze colors design.fig --json
```

Leiten Sie die Ausgabe an `jq` weiter, verwenden Sie sie in CI-Prüfungen oder in Skripten, die ein Budget für Design-Tokens durchsetzen.
