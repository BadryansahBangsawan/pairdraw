---
title: useColorVariableBinding
description: Funzioni per collegare variabili negli editor del colore di riempimenti e contorni.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` espone funzioni per cercare, collegare e scollegare le variabili colore usate dagli editor di riempimenti e contorni.

Usalo per costruire interfacce del colore che devono collegare riempimenti o contorni alle variabili di design.

## Uso

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Vedi anche

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
