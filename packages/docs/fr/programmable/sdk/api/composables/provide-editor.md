---
title: provideEditor
description: Fournir une instance d’éditeur Pairdraw à un sous-arbre Vue par injection.
---

# provideEditor

`provideEditor(editor)` rend un éditeur Pairdraw accessible aux composables et aux primitives sans styles descendants grâce à l’injection de Vue.

C’est la base de `useEditor()`.

## Utilisation

```ts
import { provideEditor } from '@pairdraw/vue'

provideEditor(editor)
```

## Exemple simple

```vue
<script setup lang="ts">
import { provideEditor } from '@pairdraw/vue'

import type { Editor } from '@pairdraw/core'

const props = defineProps<{
  editor: Editor
}>()

provideEditor(props.editor)
</script>

<template>
  <slot />
</template>
```

## Remarques

Le SDK actuel utilise directement `provideEditor()` et `useEditor()`. Certains anciens exemples et messages d’erreur mentionnent encore un composant `PairdrawProvider`, mais c’est le modèle d’injection qui constitue la véritable surface d’API, à privilégier dans la documentation et dans le code de l’application.

## Voir aussi

- [useEditor](./use-editor)
