---
title: useSelectionState
description: État réactif dérivé de la sélection, avec l’objet actuel, le nombre d’objets et le type de sélection.
---

# useSelectionState

`useSelectionState()` fournit un état réactif dérivé de la sélection de l’éditeur actuel.

Utilisez-le lorsque l’interface dépend de :

- la présence ou non d’une sélection ;
- le nombre d’objets sélectionnés ;
- l’objet sélectionné principal ;
- la nature de la sélection : instance, composant ou groupe.

## Utilisation

```ts
import { useSelectionState } from '@pairdraw/vue/editor/selection-state'

const selection = useSelectionState()
```

## Exemple simple

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

## Valeurs renvoyées

Parmi les valeurs utiles :

- `selectedIds`
- `hasSelection`
- `selectedNode`
- `selectedCount`
- `selectedNodeType`
- `isInstance`
- `isComponent`
- `isGroup`
- `canCreateComponentSet`

## Exemples pratiques

### Afficher les actions réservées aux instances

```ts
const { isInstance } = useSelectionState()
```

### Activer l’interface de création d’un ensemble de composants

```ts
const { canCreateComponentSet } = useSelectionState()
```

## Voir aussi

- [useSelectionCapabilities](./use-selection-capabilities)
- [useEditorCommands](./use-editor-commands)
- [useEditor](./use-editor)
