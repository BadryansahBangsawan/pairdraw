---
title: usePosition
description: Leer y actualizar la posición, el tamaño, el giro, la alineación y el reflejo de los objetos seleccionados.
---

# usePosition

`usePosition()` es un composable de controles para interfaces relacionadas con la posición.

Expone valores de los objetos seleccionados como:

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` y `rotation` se leen como los muestra el panel de propiedades de Figma: la esquina superior izquierda de la caja de la capa girada en el lienzo, medida desde su marco o su página, y su ángulo en sentido antihorario. `updateProp('x' | 'y' | 'rotation', value)` mueve o gira cada objeto seleccionado para que muestre ese valor, girando alrededor de su centro. `panelProp(key)` devuelve el valor común en una selección múltiple, o `MIXED`.

y acciones como:

- alinear
- reflejar
- girar
- ajustar y actualizar propiedades numéricas

## Uso

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Ejemplo básico

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Ejemplos prácticos

### Alinear los objetos seleccionados

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Reflejar la selección

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Girar la selección

```ts
position.rotate(90)
```

## Véase también

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
- [PositionControlsRoot](../components/position-controls-root)
- [usePropScrub](../advanced/use-prop-scrub)
