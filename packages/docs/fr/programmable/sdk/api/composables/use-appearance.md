---
title: useAppearance
description: Contrôler la visibilité, l’opacité, le rayon des angles et le lissage de la sélection actuelle.
---

# useAppearance

`useAppearance()` est le composable de contrôle consacré à l’apparence dans les panneaux de propriétés.

Il expose un état d’interface dérivé de la sélection pour :

- la visibilité ;
- l’opacité ;
- le rayon des angles ;
- le lissage des angles, sous forme de pourcentage normalisé ;
- des rayons indépendants pour chaque angle, y compris l’état d’angles inégaux des fichiers importés ;
- le mode de fusion.

## Utilisation

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Exemple simple

```ts
const {
  visibilityState,
  opacityPercent,
  cornerRadiusValue,
  cornerSmoothingPercent,
  showIndependentCorners,
  toggleVisibility,
  toggleIndependentCorners,
} = useAppearance()
```

## Exemples pratiques

### Basculer la visibilité de la sélection

```ts
appearance.toggleVisibility()
```

### Modifier le rayon de chaque angle

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Modifier le lissage des angles

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Affichez l’éditeur angle par angle en fonction de `showIndependentCorners`. Cette valeur tient compte à la fois de l’indicateur explicite du nœud de la scène et des nœuds importés dont les valeurs d’angle diffèrent. Avec une sélection multiple, les bascules et les validations sont regroupées en une seule entrée d’annulation.

## Voir aussi

- [Vue d’ensemble de l’API du SDK](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
