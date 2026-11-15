---
title: useSelectionState
description: Estado reactivo del editor derivado de la selección para el objeto actual, el número y el tipo de selección.
---

# useSelectionState

`useSelectionState()` expone estado reactivo derivado de la selección del editor actual.

Úselo cuando necesite representar una interfaz que dependa de:

- si hay algo seleccionado
- cuántos objetos están seleccionados
- el objeto seleccionado principal
- si la selección actual es una instancia, un componente o un grupo

## Uso

```ts
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
```

## Ejemplo básico

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

## Qué devuelve

Entre los valores útiles están:

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Ejemplos prácticos

### Mostrar acciones solo para instancias

```ts
const { isInstance } = useSelectionState()
```

### Activar la interfaz de creación de conjuntos de componentes

```ts
const { canCreateComponentSet } = useSelectionState()
```

Use este composable para representar interfaces que reaccionen a la selección sin observar los repintados del lienzo.

## Véase también

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
- [useSceneComputed](../advanced/use-scene-computed)
