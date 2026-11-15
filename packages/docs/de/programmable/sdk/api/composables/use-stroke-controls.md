---
title: useStrokeControls
description: Zustand und Aktionen des Kontur-Panels für Ausrichtung, Seiten, Linienenden, Ecken und Gehrungsgrenze.
---

# useStrokeControls

`useStrokeControls()` ist das Composable für Kontureigenschaften, das Kontur-Panels verwenden.

Es bietet:

- Optionen für die Konturausrichtung
- Seitenvorgaben wie alle, oben, unten, links, rechts und benutzerdefiniert
- Standardwerte für neue Konturen
- Hilfsfunktionen für unabhängige Stärken einzelner Seiten
- Zustand von Linienende, Eckenverbindung und Gehrungsgrenze bei gemischter Auswahl
- Änderungen von Linienende und Eckenverbindung in einem Undo-Schritt
- Vorschau- und Speicheraktionen für Felder der Gehrungsgrenze

## Verwendung

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Einfaches Beispiel

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Praktische Beispiele

### Konturausrichtung festlegen

```ts
strokes.updateAlign('INSIDE')
```

### Kontur auf eine Seite beschränken

```ts
strokes.selectSide('TOP')
```

### Geometrie der Kontur bearbeiten

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` ist nur dann `true`, wenn jedes ausgewählte Objekt mindestens eine Kontur hat. `cap`, `join` und `miterLimit` liefern den gemeinsamen Wert oder bei gemischter Auswahl `MIXED`.

Ausrichtung, Seiten und Seitenstärken wirken in einem Undo-Schritt auf alle ausgewählten Objekte. `currentAlign()` und `borderWeight(side)` liefern den gemeinsamen Wert oder `MIXED`; ein Objekt ohne Konturen zählt mit der Ausrichtung, die es für neue Konturen beibehält.

## Siehe auch

- [PropertyListRoot](../components/property-list-root)
