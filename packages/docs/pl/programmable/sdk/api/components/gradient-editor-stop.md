---
title: GradientEditorStop
description: Dostępny komponent zaznaczanego lub przeciąganego punktu gradientu.
---

<script setup lang="ts">
import { data } from '#docs-api/components/gradient-editor-stop.data'
</script>

# GradientEditorStop

`GradientEditorStop` renderuje polimorficzny punkt gradientu z udokumentowanym stanem zaznaczenia i przeciągania. Interaktywne punkty mają rolę suwaka (`slider`) i podają swoje położenie procentowe przez ARIA.

Na pasku gradientu używaj punktów interaktywnych. Klawisze strzałek przesuwają punkt o `positionStep`, a z wciśniętym Shift o krok 10 razy większy. Home i End przenoszą go na jedną z granic, a Delete i Backspace emitują `remove`, jeśli punkt można usunąć. Obsłużone klawisze zatrzymują propagację, więc skróty usuwania i przesuwania na poziomie edytora nie są wykonywane. Natywna kolejność klawisza Tab przechodzi między punktami.

Ustaw `interactive="false"`, gdy używasz komponentu wokół złożonego wiersza punktu. Wiersz nadal udostępnia działania slotu oraz `data-selected` i `data-dragging`, ale nie wchodzi do kolejności Tab suwaków.

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

## Wygenerowana dokumentacja API

<SdkComponentAPI :components="data.components" />

## Zobacz też

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorBar](./gradient-editor-bar)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
