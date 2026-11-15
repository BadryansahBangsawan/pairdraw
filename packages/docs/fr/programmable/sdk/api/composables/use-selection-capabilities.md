---
title: useSelectionCapabilities
description: Dériver des booléens adaptés aux commandes pour les interfaces et actions qui dépendent de la sélection.
---

# useSelectionCapabilities

`useSelectionCapabilities()` fournit des booléens réactifs qui indiquent si les actions courantes de l’éditeur sont autorisées à cet instant.

Utilisez-le pour construire :

- des menus ;
- des barres d’outils ;
- des raccourcis clavier ;
- des boutons d’action ;
- des panneaux contextuels.

## Utilisation

```ts
import { useSelectionCapabilities } from '@pairdraw/vue/editor/selection-capabilities'

const caps = useSelectionCapabilities()
```

## Exemple simple

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

## Exemples pratiques

### Conditionner les entrées de menu

```ts
const { canMoveToPage, canGoToMainComponent } = useSelectionCapabilities()
```

### N’activer les commandes de zoom que lorsqu’elles servent

```ts
const { canZoomToSelection } = useSelectionCapabilities()
```

## Voir aussi

- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)
