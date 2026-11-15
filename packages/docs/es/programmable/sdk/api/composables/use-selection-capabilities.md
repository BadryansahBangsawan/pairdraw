---
title: useSelectionCapabilities
description: Derivar valores booleanos aptos para comandos para interfaces y acciones que dependen de la selección.
---

# useSelectionCapabilities

`useSelectionCapabilities()` expone valores booleanos reactivos que indican si las acciones habituales del editor están permitidas en este momento.

Úselo para crear:

- menús
- barras de herramientas
- atajos de teclado
- botones de acción
- paneles contextuales

## Uso

```ts
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const caps = useSelectionCapabilities()
```

## Ejemplo básico

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

## Ejemplos prácticos

### Condicionar las entradas de menú

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### Activar los comandos de zoom solo cuando sirven

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

Use estos indicadores para activar, ocultar o desactivar comandos sin duplicar reglas de tipos.

## Véase también

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
