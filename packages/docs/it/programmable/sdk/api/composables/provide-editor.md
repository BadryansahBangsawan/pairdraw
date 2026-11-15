---
title: provideEditor
description: Fornire un'istanza dell'editor Pairdraw a un sottoalbero Vue tramite injection.
---

# provideEditor

`provideEditor(editor)` rende disponibile un editor Pairdraw ai composable discendenti e ai componenti senza stile tramite l'injection di Vue.

È la base di `useEditor()`.

## Uso

```ts
import { provideEditor } from '@pairdraw/vue'

provideEditor(editor)
```

## Esempio di base

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

## Note

L'SDK attuale usa direttamente `provideEditor()` e `useEditor()`. Alcuni esempi e messaggi di errore meno recenti citano ancora un componente `PairdrawProvider`, ma la vera API da preferire nella documentazione e nel codice dell'applicazione è il modello basato sull'injection.

## Vedi anche

- [useEditor](./use-editor)
