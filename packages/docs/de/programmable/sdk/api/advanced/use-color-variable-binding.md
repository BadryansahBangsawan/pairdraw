---
title: useColorVariableBinding
description: Farbe einer Füllung oder Kontur mit einer Variable verbinden.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` stellt Funktionen zum Suchen, Setzen und Entfernen einer Farbvariablenbindung in Füllungs- und Kontureditoren bereit.

Verwenden Sie das Composable in Farbsteuerelementen, die Füllungen oder Konturen mit Designvariablen verbinden sollen.

## Verwendung

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Siehe auch

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
