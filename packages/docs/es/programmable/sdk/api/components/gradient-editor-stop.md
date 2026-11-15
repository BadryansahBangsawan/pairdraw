---
title: GradientEditorStop
description: Primitiva accesible de un punto de degradado con navegación por teclado y estado de arrastre.
---

<script setup lang="ts">
import { data } from '#docs-api/components/gradient-editor-stop.data'
</script>

# GradientEditorStop

`GradientEditorStop` representa un punto de degradado polimórfico con estado documentado de selección y arrastre. Los puntos interactivos usan el rol slider y exponen su posición en porcentaje mediante ARIA.

Use puntos interactivos en la barra de degradado. Las teclas de flecha desplazan el punto en `positionStep`; manteniendo Shift, el paso es 10 veces mayor. Inicio y Fin lo llevan a cualquiera de los extremos, mientras que Suprimir y Retroceso emiten `remove` cuando el punto se puede eliminar. Las teclas gestionadas detienen la propagación, para que no se ejecuten los atajos de eliminación y movimiento del editor. El orden nativo de tabulación recorre los puntos.

Fije `interactive="false"` cuando reutilice la primitiva alrededor de una fila compuesta de un punto. La fila sigue exponiendo las acciones de la ranura y `data-selected`/`data-dragging`, pero no entra en el orden de tabulación del slider.

```vue twoslash
<script setup lang="ts">
import type { GradientStop } from '@pairdraw/scene-graph'
import { GradientEditorStop } from '@pairdraw/vue/primitives/GradientEditor'

const stop: GradientStop = {
  color: { r: 0.4, g: 0.2, b: 0.9, a: 1 },
  position: 0.5
}
</script>

<template>
  <GradientEditorStop
    :stop="stop"
    :index="0"
    active
    label="Middle gradient stop"
    @update-position="(_index, position) => console.log(position)"
  />
</template>
```

## Referencia de API generada

<SdkComponentAPI :components="data.components" />

## Véase también

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorBar](./gradient-editor-bar)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
