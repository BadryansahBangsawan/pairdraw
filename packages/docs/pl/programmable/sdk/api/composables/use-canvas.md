---
title: useCanvas
description: Podłączenie renderowania opartego na CanvasKit do elementu canvas edytora Pairdraw.
---

# useCanvas

`useCanvas()` łączy edytor z prawdziwym elementem `<canvas>`.

Obsługuje:

- inicjalizację CanvasKit;
- tworzenie powierzchni rysowania;
- planowanie renderowania;
- zmianę rozmiaru;
- opcjonalne wyświetlanie linijek;
- wywołanie zwrotne po przygotowaniu renderera.

## Użycie

```ts
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Podstawowy przykład

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor, {
  showRulers: true,
  onReady: () => {
    console.log('Renderer ready')
  },
})
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Praktyczne przykłady

### Wyłączenie linijek w osadzonym podglądzie

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Zachowanie bufora rysowania na potrzeby zrzutów ekranu

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Uwagi

- `useCanvas()` współpracuje bezpośrednio z rendererem i w praktyce działa tylko w przeglądarce.
- Odpowiada za potok żywego obszaru roboczego, a nie za operacje na plikach na poziomie aplikacji.
- Do obsługi działań użytkownika zwykle uzupełnia je `useCanvasInput()`.

## Zobacz też

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Typ

```ts
interface UseCanvasOptions {
  showRulers?: boolean
  preserveDrawingBuffer?: boolean
  onReady?: () => void
}

function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions,
): void
```
