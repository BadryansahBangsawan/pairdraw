---
title: useAppearance
description: Controlar la visibilidad, la opacidad, el radio de esquina y el suavizado de la selección actual.
---

# useAppearance

`useAppearance()` es el composable de controles de apariencia para paneles de propiedades.

Expone estado de interfaz derivado de la selección para:

- visibilidad
- opacidad
- radio de esquina
- suavizado de esquina como porcentaje normalizado
- radios de esquina independientes, incluido el estado de esquinas desiguales importado
- modo de fusión

## Uso

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Ejemplo básico

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

## Ejemplos prácticos

### Alternar la visibilidad de la selección

```ts
appearance.toggleVisibility()
```

### Editar los radios por esquina

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Editar el suavizado de esquina

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Renderice el editor por esquina a partir de `showIndependentCorners`. Tiene en cuenta tanto el indicador explícito del objeto de la escena como los objetos importados cuyos valores de esquina difieren. Los cambios y confirmaciones con selección múltiple se agrupan en una sola entrada de deshacer.

## Véase también

- [Resumen de la API del SDK](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
- [AppearanceControlsRoot](../components/appearance-controls-root)
- [useNodeProps](../advanced/use-node-props)
