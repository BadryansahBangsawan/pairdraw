---
title: ColorPickerRoot
description: Komponent bez narzuconego wyglądu do wyboru koloru w wyskakującym panelu, ze zdarzeniami cyklu interakcji.
---

<script setup lang="ts">
import { data } from '#docs-api/components/color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` łączy przycisk z próbką koloru z wyskakującym panelem, a sam interfejs edytora pozostawia slotom. Slot `trigger` otrzymuje bieżący styl próbki, a slot domyślny bieżący kolor z grafu sceny.

`openChange` zgłasza pełne granice interakcji z próbnikiem. `cancel` jest emitowane przed zamknięciem klawiszem Escape, dzięki czemu komponenty korzystające z BindableValue mogą razem wycofać odłączenie zmiennej i zmianę farby. Otwarcie próbnika lub ustawienie na nim fokusu nie emituje aktualizacji koloru.

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

## Wygenerowana dokumentacja API

<SdkComponentAPI :components="data.components" />

## Zobacz też

- [ColorInputRoot](./color-input-root)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
