---
title: useCanvas
description: Relier le rendu CanvasKit d’un éditeur Pairdraw à un élément canvas.
---

# useCanvas

`useCanvas()` relie un éditeur à un véritable élément `<canvas>`.

Il se charge de :

- l’initialisation de CanvasKit ;
- la création de la surface ;
- la planification du rendu ;
- la gestion du redimensionnement ;
- l’affichage facultatif des règles ;
- un rappel lorsque le moteur de rendu est prêt.

## Utilisation

```ts
import { ref } from 'vue'

import { useCanvas } from '@pairdraw/vue/canvas/surface'
import { useEditor } from '@pairdraw/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Exemple simple

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

## Exemples pratiques

### Masquer les règles dans un aperçu intégré

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Conserver le tampon de dessin pour les captures d’écran

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Remarques

- `useCanvas()` concerne le moteur de rendu et, en pratique, ne fonctionne que dans le navigateur.
- Il gère le pipeline de la zone de travail active, pas les flux de fichiers au niveau de l’application.
- Il est généralement associé à `useCanvasInput()` pour gérer les interactions.

## Voir aussi

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Type

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
