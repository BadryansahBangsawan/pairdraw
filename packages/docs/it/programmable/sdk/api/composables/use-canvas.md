---
title: useCanvas
description: Collegare a un elemento canvas il rendering basato su CanvasKit di un editor Pairdraw.
---

# useCanvas

`useCanvas()` collega un editor a un vero elemento `<canvas>`.

Si occupa di:

- inizializzare CanvasKit
- creare la superficie
- pianificare il rendering
- gestire il ridimensionamento
- mostrare facoltativamente i righelli
- richiamare una funzione quando il renderer è pronto

## Uso

```ts
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Esempio di base

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

## Esempi pratici

### Disattivare i righelli in un'anteprima incorporata

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Conservare il buffer di disegno per gli screenshot

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Note

- `useCanvas()` lavora a contatto con il renderer e in pratica funziona solo nel browser
- è responsabile della pipeline dell'area di lavoro attiva, non dei flussi dei file a livello di applicazione
- di solito va abbinato a `useCanvasInput()` per gestire le interazioni

## Vedi anche

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Tipo

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
