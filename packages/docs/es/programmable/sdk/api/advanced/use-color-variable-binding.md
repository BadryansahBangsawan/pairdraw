---
title: useColorVariableBinding
description: Función de vínculo de variables para los editores de color de rellenos y contornos.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` expone funciones para buscar, vincular y desvincular las variables de color que usan los editores de rellenos y contornos.

Úselo al crear interfaces de color que necesiten conectar rellenos o contornos con variables de diseño.

## Uso

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Véase también

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
