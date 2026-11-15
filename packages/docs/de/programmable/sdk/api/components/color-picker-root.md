---
title: ColorPickerRoot
description: Farbauswahl ohne vorgegebenes Erscheinungsbild in einem Popover, mit Ereignissen für den Ablauf der Interaktion.
---

<script setup lang="ts">
import { data } from '#docs-api/components/color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` verbindet eine Schaltfläche mit Farbmuster mit einem Popover und überlässt die eigentliche Editoroberfläche den Slots. Der Slot `trigger` erhält den aktuellen Stil des Farbmusters, der Standard-Slot die aktuelle Farbe aus dem Szenengraphen.

`openChange` meldet die gesamte Dauer einer Interaktion mit der Farbauswahl. `cancel` wird vor dem Schließen per Escape ausgegeben, sodass Nutzer von BindableValue das Lösen einer Variablenbindung und die Änderung der Füllung gemeinsam zurücknehmen können. Das Öffnen oder Fokussieren der Farbauswahl gibt keine Farbaktualisierung aus.

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

## Generierte API-Referenz

<SdkComponentAPI :components="data.components" />

## Siehe auch

- [ColorInputRoot](./color-input-root)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
