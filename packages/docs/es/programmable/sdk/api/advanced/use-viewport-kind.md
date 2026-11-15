---
title: useViewportKind
description: Leer indicadores generales de vista móvil y de escritorio para carcasas de editor adaptables.
---

# useViewportKind

`useViewportKind()` devuelve indicadores adaptables sencillos que usa la interfaz del editor de Pairdraw.

Úselo cuando su carcasa necesite una abstracción ligera sobre los puntos de corte en lugar de conectar `useBreakpoints()` directamente.

## Uso

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Valores devueltos

- `isMobile`
- `isDesktop`

## Véase también

- [useCanvas](../composables/use-canvas)
