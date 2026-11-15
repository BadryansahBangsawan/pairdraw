---
title: useSelectionState
description: Reaktiver Zustand der aktuellen Auswahl mit Hauptobjekt, Anzahl und Auswahltyp.
---

# useSelectionState

`useSelectionState()` stellt reaktiven, aus der Auswahl abgeleiteten Zustand des aktuellen Editors bereit.

Verwenden Sie es, wenn die Oberfläche davon abhängt:

- ob überhaupt etwas ausgewählt ist
- wie viele Objekte ausgewählt sind
- welches Objekt das Hauptobjekt der Auswahl ist
- ob die aktuelle Auswahl eine Instanz, Komponente oder Gruppe ist

## Verwendung

```ts
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
```

## Einfaches Beispiel

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

## Rückgabewert

Nützliche Werte sind unter anderem:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Praktische Beispiele

### Aktionen nur für Instanzen anzeigen

```ts
const { isInstance } = useSelectionState()
```

### Oberfläche zum Erstellen eines Komponentensets aktivieren

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Siehe auch

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
