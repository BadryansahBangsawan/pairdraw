---
title: useEffectsControls
description: Fonctions du panneau des effets pour les ombres, les flous, l’état déplié et la prévisualisation avant validation.
---

# useEffectsControls

`useEffectsControls()` est le composable des propriétés d’effets utilisé par les panneaux d’effets.

Il fournit des fonctions pour :

- les effets par défaut ;
- la logique propre aux ombres ou aux flous ;
- l’état déplié des éléments ;
- la modification avec prévisualisation pendant le glissement ;
- les mises à jour validées à la fin du geste ;
- le changement de type et de couleur d’un effet.

## Utilisation

```ts
import { useEffectsControls } from '@pairdraw/vue/controls/effects'

const effects = useEffectsControls()
```

## Exemple simple

```ts
const { effectOptions, createDefaultEffect, toggleExpand, scrubEffect, commitEffect } = useEffectsControls()
```

## Exemples pratiques

### Ajouter un effet par défaut

```ts
const effect = effects.createDefaultEffect()
```

### Prévisualiser pendant le glissement, puis valider

```ts
effects.scrubEffect(node, index, { radius: 12 })
effects.commitEffect(node, index, { radius: 12 })
```

## Voir aussi

- [PropertyListRoot](../components/property-list-root)
