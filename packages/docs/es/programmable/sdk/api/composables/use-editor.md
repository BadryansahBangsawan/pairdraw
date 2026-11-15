---
title: useEditor
description: Acceder a la instancia inyectada actual del editor de Pairdraw.
---

# useEditor

`useEditor()` devuelve el editor de Pairdraw inyectado actualmente.

Es el punto de entrada principal para los composables del SDK y las primitivas sin estilos que necesitan acceder al editor.

## Uso

`useEditor()` debe llamarse dentro de un subárbol en el que ya se haya llamado a `provideEditor(editor)`.

```ts
import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
```

## Ejemplo básico

```vue
<script setup lang="ts">
import { computed } from 'vue'

import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
const pageId = computed(() => editor.state.currentPageId)
</script>

<template>
  <div>Current page: {{ pageId }}</div>
</template>
```

## Ejemplos prácticos

### Leer los objetos seleccionados

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Ejecutar comandos

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Comportamiento ante errores

Si se llama fuera de un árbol con un proveedor del editor, `useEditor()` lanza un error con un mensaje útil.

Es intencionado: esta API debe fallar de forma evidente cuando falta el contexto del editor.

## Véase también

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
- [Arquitectura](../../architecture)

## Tipo

```ts
function useEditor(): Editor
```
