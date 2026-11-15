---
title: usePosition
description: Position, Größe, Drehung, Ausrichtung und Spiegelung der ausgewählten Objekte lesen und ändern.
---

# usePosition

`usePosition()` ist ein Composable für Steuerelemente rund um die Position.

Es stellt Werte der ausgewählten Objekte bereit, etwa:

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` und `rotation` entsprechen der Anzeige im Eigenschaften-Panel von Figma: die obere linke Ecke des gedrehten Begrenzungsrahmens der Ebene auf der Arbeitsfläche, gemessen von ihrem Frame oder ihrer Seite, und ihr Winkel gegen den Uhrzeigersinn. `updateProp('x' | 'y' | 'rotation', value)` verschiebt oder dreht jedes ausgewählte Objekt so, dass es diesen Wert zeigt; gedreht wird um den Mittelpunkt. `panelProp(key)` liefert den gemeinsamen Wert einer Mehrfachauswahl oder `MIXED`.

Außerdem bietet es Aktionen wie:

- Ausrichten
- Spiegeln
- Drehen
- numerische Eigenschaften per Ziehen ändern oder direkt setzen

## Verwendung

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Einfaches Beispiel

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Praktische Beispiele

### Ausgewählte Objekte ausrichten

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Auswahl spiegeln

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Auswahl drehen

```ts
position.rotate(90)
```

## Siehe auch

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
