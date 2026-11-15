---
title: useSelectionState
description: Reaktywny stan edytora wyprowadzony z zaznaczenia, bieżącego obiektu, liczby i typu zaznaczenia.
---

# useSelectionState

`useSelectionState()` udostępnia reaktywny stan wyprowadzony z zaznaczenia w bieżącym edytorze.

Przydaje się, gdy interfejs zależy od tego:

- czy cokolwiek jest zaznaczone;
- ile obiektów jest zaznaczonych;
- który obiekt jest zaznaczony jako główny;
- czy bieżące zaznaczenie jest instancją, komponentem czy grupą.

## Użycie

```ts
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
```

## Podstawowy przykład

```vue
<script setup lang="ts">
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const { hasSelection, selectedCount, isInstance } = useSelectionState()
</script>

<template>
  <div class="text-xs text-muted">
    <span v-if="!hasSelection">No selection</span>
    <span v-else>
      {{ selectedCount }} selected
      <span v-if="isInstance">· instance</span>
    </span>
  </div>
</template>
```

## Zwracane wartości

Przydatne wartości to między innymi:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Praktyczne przykłady

### Działania dostępne tylko dla instancji

```ts
const { isInstance } = useSelectionState()
```

### Interfejs tworzenia zestawu komponentów

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Zobacz też

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
