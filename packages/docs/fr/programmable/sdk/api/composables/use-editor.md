---
title: useEditor
description: Accéder à l’instance d’éditeur Pairdraw injectée.
---

# useEditor

`useEditor()` renvoie l’éditeur Pairdraw actuellement injecté.

C’est le point d’entrée principal des composables du SDK et des primitives sans styles qui ont besoin d’accéder à l’éditeur.

## Utilisation

`useEditor()` doit être appelé dans un sous-arbre où `provideEditor(editor)` a déjà été appelé.

```ts
import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
```

## Exemple simple

```vue
<script setup lang="ts">
import { computed } from 'vue'

import { useEditor } from '@pairdraw/vue'

const editor = useEditor()
const pageId = computed(() => editor.state.currentPageId)
</script>

<template>
  <div>Current page: {{ pageId }}</div>
</template>
```

## Exemples pratiques

### Lire les nœuds sélectionnés

```ts
const editor = useEditor()
const selected = editor.getSelectedNodes()
```

### Déclencher des commandes

```ts
const editor = useEditor()
editor.zoomToFit()
editor.undoAction()
```

## Comportement en cas d’erreur

Appelé en dehors d’un arbre qui fournit l’éditeur, `useEditor()` lève une erreur accompagnée d’un message explicite.

C’est voulu : cette API doit échouer bruyamment lorsque le contexte de l’éditeur manque.

## Voir aussi

- [provideEditor](./provide-editor)
- [useCanvas](./use-canvas)
- [useSelectionState](./use-selection-state)
- [useEditorCommands](./use-editor-commands)

## Type

```ts
function useEditor(): Editor
```
