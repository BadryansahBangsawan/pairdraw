---
title: useCanvas
description: Conectar el renderizado basado en CanvasKit con un elemento canvas para un editor de Pairdraw.
---

# useCanvas

`useCanvas()` conecta un editor con un elemento `<canvas>` real.

Se encarga de:

- la inicialización de CanvasKit
- la creación de la superficie
- la planificación del renderizado
- la gestión del redimensionado
- la visibilidad opcional de las reglas
- la función de aviso cuando el renderizador está listo

## Uso

```ts
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Ejemplo básico

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

## Ejemplos prácticos

### Desactivar las reglas en una vista previa integrada

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Conservar el búfer de dibujo para capturas de pantalla

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Notas

- `useCanvas()` está orientado al renderizador y, en la práctica, solo funciona en el navegador
- es responsable de la canalización del lienzo en vivo, no de los flujos de archivos de la aplicación
- normalmente debe combinarse con `useCanvasInput()` para gestionar la interacción

Use `CanvasRoot` y `CanvasSurface` para la composición habitual, o este composable cuando necesite controlar directamente el elemento.

## Véase también

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)
- [CanvasRoot](../components/canvas-root)
- [CanvasSurface](../components/canvas-surface)

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
