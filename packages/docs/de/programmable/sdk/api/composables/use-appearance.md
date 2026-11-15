---
title: useAppearance
description: Sichtbarkeit, Deckkraft, Eckenradius und Eckenglättung der aktuellen Auswahl verwalten.
---

# useAppearance

`useAppearance()` ist das Composable für den Bereich Erscheinungsbild in Eigenschaften-Panels.

Es leitet aus der Auswahl den Zustand der Oberfläche ab für:

- Sichtbarkeit
- Deckkraft
- Eckenradius
- Eckenglättung als normalisierten Prozentwert
- unabhängige Eckenradien, einschließlich importierter Objekte mit ungleichen Ecken
- Mischmodus

## Verwendung

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Einfaches Beispiel

```ts
const {
  visibilityState,
  opacityPercent,
  cornerRadiusValue,
  cornerSmoothingPercent,
  showIndependentCorners,
  toggleVisibility,
  toggleIndependentCorners,
} = useAppearance()
```

## Praktische Beispiele

### Sichtbarkeit der Auswahl umschalten

```ts
appearance.toggleVisibility()
```

### Radien einzelner Ecken bearbeiten

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Eckenglättung bearbeiten

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Ob der Editor für einzelne Ecken angezeigt wird, richtet sich nach `showIndependentCorners`. Der Wert berücksichtigt sowohl das ausdrückliche Flag des Objekts als auch importierte Objekte, deren Eckenwerte voneinander abweichen. Umschalten und Speichern bei Mehrfachauswahl ergeben jeweils einen einzigen Undo-Schritt.

## Siehe auch

- [SDK-API-Übersicht](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
