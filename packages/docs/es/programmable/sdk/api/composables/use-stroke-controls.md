---
title: useStrokeControls
description: Estado y acciones del panel de contornos para alineación, lados, extremos, uniones y límites de inglete.
---

# useStrokeControls

`useStrokeControls()` es el composable de la propiedad de contorno que usan los paneles de edición de contornos.

Proporciona:

- opciones de alineación del contorno
- preajustes de lados como todos, superior, inferior, izquierdo, derecho y personalizado
- datos de contorno predeterminados
- funciones para los grosores de borde por lado
- el estado de extremos, uniones y límite de inglete en selecciones mixtas
- actualizaciones de extremos y uniones agrupadas para deshacer
- acciones de vista previa y confirmación para los campos de límite de inglete

## Uso

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Ejemplo básico

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Ejemplos prácticos

### Fijar la alineación del contorno

```ts
strokes.updateAlign('INSIDE')
```

### Limitar un contorno a un lado

```ts
strokes.selectSide('TOP')
```

### Editar la geometría del contorno

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` solo es true cuando cada objeto seleccionado tiene al menos un contorno. `cap`, `join` y `miterLimit` devuelven el valor común, o `MIXED` en una selección mixta.

La alineación, los lados y los grosores de borde actúan sobre todos los objetos seleccionados en un solo paso de deshacer. `currentAlign()` y `borderWeight(side)` devuelven el valor común o `MIXED`; un objeto sin contornos cuenta con la alineación que conserva para los contornos nuevos.

## Véase también

- [PropertyListRoot](../components/property-list-root)
- [useColorVariableBinding](../advanced/use-color-variable-binding)
