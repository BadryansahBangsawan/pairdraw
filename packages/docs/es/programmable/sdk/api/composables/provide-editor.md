---
title: provideEditor
description: Proporcionar una instancia del editor de Pairdraw a un subárbol de Vue mediante inyección.
---

# provideEditor

`provideEditor(editor)` pone un editor de Pairdraw a disposición de los composables y las primitivas sin estilos descendientes mediante la inyección de Vue.

Es la base de `useEditor()`.

## Uso

```ts
import { provideEditor } from '@pairdraw/vue'

provideEditor(editor)
```

## Ejemplo básico

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

## Notas

El SDK actual usa directamente `provideEditor()` y `useEditor()`. Algunos ejemplos y mensajes de error antiguos todavía mencionan un componente `PairdrawProvider`, pero el modelo de inyección es la API real que conviene preferir en la documentación y en el código de la aplicación.

Llámelo una vez en el componente raíz de la interfaz y use `useEditor()` en sus descendientes.

## Véase también

- [useEditor](./use-editor)
- [Primeros pasos](../../getting-started)
