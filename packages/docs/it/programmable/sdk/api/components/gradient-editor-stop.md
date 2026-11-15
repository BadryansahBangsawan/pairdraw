---
title: GradientEditorStop
description: Componente accessibile per un punto della sfumatura selezionato o trascinabile.
---

<script setup lang="ts">
import { data } from '#docs-api/components/gradient-editor-stop.data'
</script>

# GradientEditorStop

`GradientEditorStop` disegna un punto della sfumatura polimorfico, con stati documentati di selezione e trascinamento. I punti interattivi usano il ruolo slider ed espongono la loro posizione percentuale tramite ARIA.

Usa i punti interattivi sulla barra della sfumatura. I tasti freccia spostano il punto di `positionStep`; tenendo premuto <kbd>Maiusc</kbd> il passo diventa 10 volte più grande. <kbd>Home</kbd> e <kbd>Fine</kbd> lo portano a uno dei due estremi, mentre <kbd>Canc</kbd> e <kbd>Backspace</kbd> emettono `remove` quando il punto può essere rimosso. I tasti gestiti interrompono la propagazione, così le scorciatoie dell'editor per eliminare e spostare non vengono eseguite. L'ordine nativo di <kbd>Tab</kbd> passa da un punto all'altro.

Imposta `interactive="false"` quando riusi il componente attorno a una riga composita di un punto. La riga espone comunque le azioni dello slot e `data-selected`/`data-dragging`, ma non entra nell'ordine di tabulazione dello slider.

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

## Riferimento API generato

<SdkComponentAPI :components="data.components" />

## Vedi anche

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorBar](./gradient-editor-bar)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
