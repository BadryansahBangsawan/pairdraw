---
title: useSelectionState
description: Stato reattivo dell'editor derivato dalla selezione, con nodo corrente, numero di elementi e tipo di selezione.
---

# useSelectionState

`useSelectionState()` espone lo stato reattivo derivato dalla selezione dell'editor corrente.

Usalo quando devi disegnare l'interfaccia in base a:

- se c'è qualcosa di selezionato
- quanti nodi sono selezionati
- il nodo selezionato principale
- se la selezione corrente è un'istanza, un componente o un gruppo

## Uso

```ts
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
```

## Esempio di base

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

## Cosa restituisce

Tra i valori utili:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Esempi pratici

### Mostrare azioni riservate alle istanze

```ts
const { isInstance } = useSelectionState()
```

### Attivare l'interfaccia per creare un set di componenti

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Vedi anche

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
