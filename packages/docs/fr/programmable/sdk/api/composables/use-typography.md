---
title: useTypography
description: Lire et modifier la police, l’alignement, la casse, la troncature et les fonctionnalités OpenType des objets texte.
---

# useTypography

`useTypography()` est le composable de contrôle des propriétés de texte pour les panneaux d’édition de texte. Il agit sur les calques texte de la sélection : `nodes` les contient, `node` est le premier, et chaque action les modifie tous en une seule étape d’annulation ; une sélection mêlant du texte et d’autres calques ne modifie donc que le texte.

Il fournit :

- la famille de police ;
- le style de police : `faces`, les styles de la famille des calques sélectionnés sous les noms que leur donnent leurs polices (Book et Roman d’Avenir restent distincts), lus dans les polices installées et chez les fournisseurs de polices web, avec toutes les graisses standard tant que les styles d’une famille sont inconnus ; `faceName`, le style commun aux calques ou `MIXED` ; et `setFace(style)`, qui applique un style d’après son nom ;
- la taille de police ;
- l’état de la mise en forme ;
- l’état des polices manquantes ;
- l’alignement horizontal et vertical, justification comprise ;
- la casse et la direction du texte ;
- la troncature en fin de texte et le nombre maximal de lignes ;
- l’activation des fonctionnalités OpenType ;
- les axes des polices variables (`axes`, `opticalSizeAuto`) ;
- le style de liste (`listType`, `null` lorsque les paragraphes diffèrent) et les listes en retrait suspendu ;
- des utilitaires pour changer la famille, le style, la graisse, l’alignement et les décorations ;
- `merged(key)` et `fontFeature(tag)`, qui renvoient la valeur commune ou `MIXED`.

## Utilisation

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Exemple simple

```ts
const {
  fontFamily,
  fontWeight,
  fontSize,
  activeFormatting,
  setFamily,
  setFace,
  setWeight,
  setAlign,
  setVerticalAlign,
  setTextCase,
  setTruncation,
  setFontFeature,
} = useTypography()
```

## Exemples pratiques

### Charger et changer de famille de police

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Activer ou désactiver la mise en forme

Comme dans Figma, un changement de famille conserve la graisse et l’inclinaison de chaque calque lorsque la nouvelle famille les propose, sinon la graisse la plus proche avec la même inclinaison ; `toggleBold` et `toggleItalic` laissent un calque inchangé lorsque sa famille n’a pas le style voulu.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Créer une liste

Pendant l’édition du texte, `setListType` et `setParagraphSpacing` modifient les paragraphes sous le curseur ou la sélection ; sinon, ils modifient tout le texte. `paragraphSpacing(field)` lit `listSpacing`, `paragraphSpacing` ou `paragraphIndent` pour ces paragraphes, `MIXED` lorsqu’ils diffèrent, et `previewParagraphSpacing` affiche une valeur pendant le glissement d’un champ sans créer d’étape d’annulation.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Régler les axes d’une police variable

`axes` liste les axes de la police variable du texte sélectionné, chacun avec son `tag`, son `name`, sa plage et la `value` à laquelle il est dessiné (`MIXED` si les calques diffèrent) ; la liste est vide pour une police statique ou des calques de familles différentes. `previewAxis` affiche une valeur pendant le glissement d’un champ, `setAxis` la fixe en une étape d’annulation et `setOpticalSizeAuto` fait suivre la taille optique à la taille de police ou la fige. Changer de graisse, d’inclinaison ou de famille ramène les axes à ceux du style.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Voir aussi

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
