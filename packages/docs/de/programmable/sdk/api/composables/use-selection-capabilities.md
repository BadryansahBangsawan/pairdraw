---
title: useSelectionCapabilities
description: Reaktive Wahrheitswerte für die mit der aktuellen Auswahl verfügbaren Aktionen.
---

# useSelectionCapabilities

`useSelectionCapabilities()` stellt reaktive Wahrheitswerte bereit, die angeben, ob typische Editoraktionen gerade erlaubt sind.

Es eignet sich für:

- Menüs
- Werkzeugleisten
- Tastenkürzel
- Schaltflächen für Aktionen
- kontextabhängige Panels

## Verwendung

```ts
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const caps = useSelectionCapabilities()
```

## Einfaches Beispiel

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

## Praktische Beispiele

### Menüeinträge freigeben

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Zoombefehle nur aktivieren, wenn sie sinnvoll sind

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Siehe auch

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
