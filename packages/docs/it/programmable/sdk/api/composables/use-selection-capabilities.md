---
title: useSelectionCapabilities
description: Ricavare valori booleani adatti ai comandi per interfacce e azioni guidate dalla selezione.
---

# useSelectionCapabilities

`useSelectionCapabilities()` espone valori booleani reattivi che indicano se le azioni più comuni dell'editor sono consentite in questo momento.

Usalo per costruire:

- menu
- barre degli strumenti
- scorciatoie da tastiera
- pulsanti di azione
- pannelli contestuali

## Uso

```ts
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const caps = useSelectionCapabilities()
```

## Esempio di base

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

## Esempi pratici

### Abilitare le voci di menu solo quando servono

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Attivare i comandi di zoom solo quando sono utili

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Vedi anche

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
