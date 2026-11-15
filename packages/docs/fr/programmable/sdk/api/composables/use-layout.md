---
title: useLayout
description: Gérer disposition automatique, dimensionnement, marges intérieures, alignement et pistes Grid.
---

# useLayout

`useLayout()` est le principal composable de contrôle des panneaux de disposition.

Il fournit l’état et les actions pour :

- le mode Flex ou Grid ;
- le dimensionnement en largeur et en hauteur, et les dimensions dérivées modifiables ;
- les tailles minimale et maximale ;
- les marges intérieures ;
- l’alignement ;
- la modification des pistes du modèle Grid.

## Utilisation

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Dimensionnement par axe

```ts
const {
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()

setAxisSizing('width', 'HUG')
setAxisSizing('height', 'FILL')
```

Reliez `updateAxisSize()` et `commitAxisSize()` à un champ numérique. Modifier une valeur en mode Ajuster au contenu ou Remplir ne fait passer que cet axe en mode Fixe, et seulement lors de la première modification effective :

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Pour valider en une seule étape, et annuler avec Échap, à la fois le changement de mode de dimensionnement, le détachement d’une variable et la valeur numérique, composez le NumberField avec [`BindableValue`](/programmable/sdk/api/components/bindable-value) et un fournisseur qui implémente les lots d’interaction. Donner simplement le focus au champ ne change pas son mode de dimensionnement.

## Verrouillage des proportions

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` verrouille le calque sélectionné sur ses proportions actuelles ou le déverrouille. Tant qu’il est verrouillé, `updateAxisSize()` modifie les deux côtés. `aspectRatioLockable` vaut false pour un calque situé dans une instance, qui conserve le verrouillage de son composant.

## Tailles limites

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Exemples pratiques

### Basculer entre marges intérieures uniformes et individuelles

```ts
layout.toggleIndividualPadding()
```

### Modifier les pistes Grid

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Changer l’alignement

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Voir aussi

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)
