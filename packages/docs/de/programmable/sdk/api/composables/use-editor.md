---
title: useEditor
description: Auf die mit provideEditor bereitgestellte Pairdraw-Editorinstanz zugreifen.
---

# useEditor

`useEditor()` gibt die Editorinstanz aus dem nächsten `provideEditor()`-Kontext zurück.

Composables und Komponenten ohne vorgegebenes Erscheinungsbild verwenden diese Funktion als zentralen Zugang zum Editor.

## Verwendung

`useEditor()` muss innerhalb eines Teilbaums aufgerufen werden, in dem bereits `provideEditor(editor)` aufgerufen wurde.

```ts
import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
```

## Einfaches Beispiel

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

## Praktische Beispiele

### Ausgewählte Objekte lesen

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Befehle auslösen

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Fehlerverhalten

Außerhalb eines Provider-Baums löst `useEditor()` einen Fehler mit einer verständlichen Meldung aus.

Das ist beabsichtigt: Fehlt der Editorkontext, soll diese API deutlich scheitern.

## Siehe auch

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Typ

```ts
function useEditor(): Editor
```
