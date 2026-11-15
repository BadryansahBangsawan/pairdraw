---
title: useEditor
description: Accedere all'istanza dell'editor Pairdraw fornita tramite injection.
---

# useEditor

`useEditor()` restituisce l'editor Pairdraw fornito tramite injection.

È il punto di accesso principale per i composable dell'SDK e per i componenti senza stile che hanno bisogno dell'editor.

## Uso

`useEditor()` va chiamato all'interno di un sottoalbero in cui è già stato chiamato `provideEditor(editor)`.

```ts
import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
```

## Esempio di base

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

## Esempi pratici

### Leggere i nodi selezionati

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Eseguire comandi

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Comportamento in caso di errore

Se viene chiamato fuori da un albero in cui l'editor è stato fornito, `useEditor()` genera un errore con un messaggio esplicativo.

È voluto: questa API deve fallire in modo evidente quando manca il contesto dell'editor.

## Vedi anche

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Tipo

```ts
function useEditor(): Editor
```
