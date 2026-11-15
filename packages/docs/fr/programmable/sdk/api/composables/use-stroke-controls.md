---
title: useStrokeControls
description: État et actions du panneau de contour pour l’alignement, les côtés, les extrémités, les jointures et la limite d’onglet.
---

# useStrokeControls

`useStrokeControls()` est le composable des propriétés de contour utilisé par les panneaux d’édition des contours.

Il fournit :

- les options d’alignement du contour ;
- des préréglages de côtés : tous, haut, bas, gauche, droite, personnalisé ;
- les données d’un contour par défaut ;
- des utilitaires pour les épaisseurs par côté ;
- l’état des extrémités, jointures et limite d’onglet, y compris pour une sélection mixte ;
- des modifications d’extrémités et de jointures regroupées dans l’annulation ;
- des actions d’aperçu et de validation pour les champs de limite d’onglet.

## Utilisation

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Exemple simple

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Exemples pratiques

### Définir l’alignement du contour

```ts
strokes.updateAlign('INSIDE')
```

### Limiter un contour à un seul côté

```ts
strokes.selectSide('TOP')
```

### Modifier la géométrie du contour

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` ne vaut true que si chaque objet sélectionné a au moins un contour. `cap`, `join` et `miterLimit` renvoient la valeur commune, ou `MIXED` pour une sélection mixte.

L’alignement, les côtés et les épaisseurs s’appliquent à tous les objets sélectionnés en une seule étape d’annulation. `currentAlign()` et `borderWeight(side)` renvoient la valeur commune ou `MIXED` ; un objet sans contour compte avec l’alignement qu’il conserve pour ses nouveaux contours.

## Voir aussi

- [PropertyListRoot](../components/property-list-root)
