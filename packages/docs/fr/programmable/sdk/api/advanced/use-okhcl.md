---
title: useOkHCL
description: Enregistrer l’intention OkHCL des remplissages et contours des objets sélectionnés.
---

# useOkHCL

`useOkHCL()` est l’adaptateur, lié à l’éditeur, des métadonnées OkHCL des remplissages et contours. Il lit l’intention de couleur enregistrée, met à jour les objets avec prise en charge de l’annulation, fournit les informations de gamut de l’aperçu et mémorise le format de champ choisi pour chaque remplissage ou contour.

Utilisez [`useColorModel()`](/programmable/sdk/api/composables/use-color-model) pour la conversion indépendante du framework, la modification des canaux et la présentation des curseurs. Réservez `useOkHCL()` aux cas où ces modifications doivent être enregistrées dans un éditeur Pairdraw.

## Utilisation

```ts
import { useOkHCL } from '@pairdraw/vue/controls/okhcl'

const okhcl = useOkHCL()

const color = okhcl.getFillOkHCLColor(node, 0)
okhcl.updateFillOkHCL(node, 0, { c: 0.2 })
```

## État du format

```ts
const format = okhcl.getFieldFormat(node, 0, 'fill')
okhcl.setFillFieldFormat(node, 0, 'okhcl')
```

Choisir `okhcl` initialise l’intention à partir de la couleur RGBA actuelle du remplissage ou du contour. Le `fieldOptions` renvoyé permet de construire un sélecteur de format.

## Informations d’aperçu

```ts
const preview = okhcl.getFillPreviewInfo(node, 0)
// { previewColorSpace, clipped }
```

Les informations d’aperçu reflètent l’espace colorimétrique de rendu du document et indiquent si l’intention OkHCL enregistrée a dû être ramenée dans le gamut.

## Valeurs renvoyées

- `getFillOkHCLColor()` / `getStrokeOkHCLColor()`
- `getFillPreviewInfo()` / `getStrokePreviewInfo()`
- `getFieldFormat()`
- `setFillFieldFormat()` / `setStrokeFieldFormat()`
- `updateFillOkHCL()` / `updateStrokeOkHCL()`
- `fieldOptions`

## Voir aussi

- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)
