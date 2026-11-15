---
title: useSelectionCapabilities
description: Reaktywne wartości logiczne określające działania dostępne dla bieżącego zaznaczenia.
---

# useSelectionCapabilities

`useSelectionCapabilities()` udostępnia reaktywne wartości logiczne wskazujące, czy typowe działania edytora są w tej chwili dozwolone.

Przydaje się przy budowie:

- menu;
- pasków narzędzi;
- skrótów klawiszowych;
- przycisków działań;
- paneli zależnych od kontekstu.

## Użycie

```ts
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const caps = useSelectionCapabilities()
```

## Podstawowy przykład

```vue
<script setup lang="ts">
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const { canDelete, canDuplicate, canCreateComponent } = useSelectionCapabilities()
</script>

<template>
  <div class="flex gap-2">
    <button :disabled="!canDuplicate">Duplicate</button>
    <button :disabled="!canDelete">Delete</button>
    <button :disabled="!canCreateComponent">Make component</button>
  </div>
</template>
```

## Praktyczne przykłady

### Warunkowe pozycje menu

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Polecenia powiększenia tylko wtedy, gdy mają sens

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Zobacz też

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
