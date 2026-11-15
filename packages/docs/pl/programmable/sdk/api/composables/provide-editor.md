---
title: provideEditor
description: Udostępnianie instancji edytora Pairdraw komponentom potomnym przez dependency injection.
---

# provideEditor

`provideEditor(editor)` udostępnia edytor Pairdraw funkcjom composable i komponentom bez narzuconych stylów znajdującym się niżej w drzewie Vue.

Na tej funkcji opiera się `useEditor()`.

## Użycie

```ts
import { provideEditor } from '@pairdraw/vue'

provideEditor(editor)
```

## Podstawowy przykład

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

## Uwagi

Aktualne SDK używa bezpośrednio `provideEditor()` i `useEditor()`. Niektóre starsze przykłady i komunikaty błędów wspominają komponent `PairdrawProvider`, ale w dokumentacji i kodzie aplikacji należy korzystać z modelu wstrzykiwania, który stanowi rzeczywiste API.

## Zobacz też

- [useEditor](./use-editor)
