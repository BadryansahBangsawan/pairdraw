---
title: useColorVariableBinding
description: Привязка цветовых переменных к заливкам и обводкам.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` предоставляет функции поиска, установки и удаления привязки цветовых переменных в заливках или обводках.

Используйте composable в элементах управления цветом, которым нужно связывать заливки или обводки с переменными дизайна.

## Использование

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## См. также

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
