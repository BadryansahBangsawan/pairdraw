---
title: useMenuModel
description: Construire les modèles du menu de l’application et du menu de la zone de travail à partir de l’état de l’éditeur.
---

# useMenuModel

`useMenuModel()` construit des structures de menu de plus haut niveau à partir des commandes de l’éditeur et de l’état de la sélection.

Il est utile lorsque vous voulez des groupes de menu prêts à afficher au lieu de composer les commandes vous-même.

## Utilisation

```ts
import { useMenuModel } from '@pairdraw/vue/editor/menu-model'

const { appMenu, canvasMenu, selectionLabelMenu } = useMenuModel()
```

## Exemple simple

```ts
const { canvasMenu } = useMenuModel()
```

Affichez `canvasMenu.value` dans votre composant de menu contextuel.

## Exemples pratiques

### Menu principal de type application

`appMenu` regroupe les entrées en :

- Édition
- Affichage
- Objet
- Disposition

### Menu contextuel avec déplacement vers une page

`canvasMenu` contient des entrées dynamiques comme « Déplacer vers la page », selon la sélection actuelle et les pages disponibles.

### Libellés selon la sélection

`selectionLabelMenu` fournit des libellés qui dépendent du contexte, par exemple :

- `Masquer` / `Afficher`
- `Verrouiller` / `Déverrouiller`

## Voir aussi

- [useEditorCommands](./use-editor-commands)
- [useSelectionState](./use-selection-state)
- [useSelectionCapabilities](./use-selection-capabilities)
