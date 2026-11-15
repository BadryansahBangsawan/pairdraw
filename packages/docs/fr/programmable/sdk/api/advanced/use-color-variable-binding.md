---
title: useColorVariableBinding
description: Lier la couleur d’un remplissage ou d’un contour à une variable.
---

# useColorVariableBinding

`useColorVariableBinding(kind)` fournit les fonctions pour rechercher des variables de couleur, lier une couleur à l’une d’elles et supprimer cette liaison, dans les éditeurs de remplissages et de contours.

Utilisez-le dans les interfaces de couleur qui doivent relier des remplissages ou des contours aux variables de design.

## Utilisation

```ts
import { useColorVariableBinding } from '@pairdraw/vue/controls/color-variable-binding'

const fillBinding = useColorVariableBinding('fills')
const strokeBinding = useColorVariableBinding('strokes')
```

## Voir aussi

- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [FillRoot](/programmable/sdk/api/components/fill-root)
