---
title: ColorPickerRoot
description: Selector de color sin estilos basado en un popover, con eventos del ciclo de vida de la interacción.
---

<script setup lang="ts">
import { data } from '#docs-api/components/color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` compone un disparador con muestra de color y una superficie de popover, y deja la interfaz del editor a sus ranuras. La ranura del disparador recibe el estilo actual de la muestra; la ranura predeterminada recibe el color actual del grafo de escena.

`openChange` informa del límite completo de la interacción con el selector. `cancel` se emite antes de un cierre con Escape, lo que permite a los consumidores de BindableValue revertir juntas la desvinculación de una variable y la actualización de la pintura. Abrir el selector o darle el foco no emite ninguna actualización de color.

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { ColorPickerRoot } from '@pairdraw/vue/primitives/ColorPicker'

const color = ref<Color>({ r: 0.2, g: 0.5, b: 0.9, a: 1 })
</script>

<template>
  <ColorPickerRoot
    :color="color"
    @update="color = $event"
    @open-change="open => console.log(open)"
    @cancel="console.log('cancel')"
  >
    <template #trigger="{ style }">
      <button :style="style" aria-label="Edit color" />
    </template>
    <template #default="{ color: currentColor }">
      <output>{{ currentColor.r }}, {{ currentColor.g }}, {{ currentColor.b }}</output>
    </template>
  </ColorPickerRoot>
</template>
```

## Referencia de API generada

<SdkComponentAPI :components="data.components" />

## Véase también

- [ColorInputRoot](./color-input-root)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [useOkHCL](../advanced/use-okhcl)
