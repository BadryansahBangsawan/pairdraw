---
title: useColorVariableBinding
description: Funkcje powiązań zmiennych dla edytorów koloru wypełnienia i obwiedni.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` udostępnia funkcje wyszukiwania, powiązywania i odłączania zmiennych kolorów używanych przez edytory wypełnień i obwiedni.

Użyj go przy budowie interfejsów koloru, które muszą łączyć wypełnienia lub obwiednie ze zmiennymi projektu.

## Użycie

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Zobacz też

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
