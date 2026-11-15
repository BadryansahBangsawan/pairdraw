---
title: useEditor
description: Dostęp do instancji edytora Pairdraw przekazanej przez provideEditor.
---

# useEditor

`useEditor()` zwraca instancję edytora Pairdraw przekazaną przez najbliższe wywołanie `provideEditor()`.

To główny punkt wejścia dla composables i komponentów bez narzuconego wyglądu wymagających dostępu do edytora.

## Użycie

Wywołaj `useEditor()` wewnątrz drzewa komponentów, w którym wcześniej wykonano `provideEditor(editor)`.

```ts
import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
```

## Podstawowy przykład

```vue
<script setup lang="ts">
import { computed } from 'vue'

import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
const pageId = computed(() => editor.state.currentPageId)
</script>

<template>
  <div>Bieżąca strona: {{ pageId }}</div>
</template>
```

## Praktyczne przykłady

### Odczyt zaznaczonych obiektów

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Wywoływanie poleceń

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Zachowanie przy błędzie

Jeśli `useEditor()` zostanie wywołane poza drzewem, w którym wykonano `provideEditor()`, funkcja zgłosi błąd z czytelnym komunikatem.

To celowe: przy braku kontekstu edytora to API ma kończyć się wyraźnym błędem.

## Zobacz też

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Typ

```ts
function useEditor(): Editor
```
