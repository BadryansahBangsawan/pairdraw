---
title: ColorPickerRoot
description: Selettore colore senza stile in un popover, con eventi sul ciclo dell'interazione.
---

<script setup lang="ts">
import { data } from '#docs-api/components/color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` unisce un pulsante con il campione del colore a un popover e lascia ai propri slot l'interfaccia di modifica. Lo slot `trigger` riceve lo stile corrente del campione; lo slot predefinito riceve il colore corrente del grafo della scena.

`openChange` segnala l'inizio e la fine dell'intera interazione con il selettore. `cancel` viene emesso prima di una chiusura con <kbd>Esc</kbd>, così chi usa `BindableValue` può annullare insieme lo scollegamento di una variabile e l'aggiornamento della pittura. Aprire il selettore o dargli il focus non emette alcun aggiornamento del colore.

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

## Riferimento API generato

<SdkComponentAPI :components="data.components" />

## Vedi anche

- [ColorInputRoot](./color-input-root)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
