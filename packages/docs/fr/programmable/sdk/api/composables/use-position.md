---
title: usePosition
description: Lire et modifier la position, la taille, la rotation, l’alignement et la symétrie des objets sélectionnés.
---

# usePosition

`usePosition()` est un composable de contrôle pour les interfaces liées à la position.

Il fournit les valeurs de l’objet sélectionné, par exemple :

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` et `rotation` se lisent comme dans le panneau de propriétés de Figma : le coin supérieur gauche du cadre du calque pivoté sur la zone de travail, mesuré depuis son frame ou sa page, et son angle dans le sens antihoraire. `updateProp('x' | 'y' | 'rotation', value)` déplace ou fait pivoter chaque objet sélectionné pour qu’il affiche cette valeur, en tournant autour de son centre. `panelProp(key)` donne la valeur commune d’une sélection multiple, ou `MIXED`.

Il fournit aussi des actions :

- aligner ;
- appliquer une symétrie ;
- faire pivoter ;
- faire glisser ou modifier les propriétés numériques.

## Utilisation

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Exemple simple

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Exemples pratiques

### Aligner les objets sélectionnés

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Appliquer une symétrie à la sélection

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Faire pivoter la sélection

```ts
position.rotate(90)
```

## Voir aussi

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
