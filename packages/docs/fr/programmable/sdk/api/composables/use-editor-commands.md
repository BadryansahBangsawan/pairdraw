---
title: useEditorCommands
description: Construire menus, actions et interfaces pilotées par des commandes au-dessus de l’éditeur.
---

# useEditorCommands

`useEditorCommands()` expose une couche orientée commandes au-dessus des actions de l’éditeur.

Il est utile pour construire :

- des menus d’application ;
- des menus contextuels ;
- des barres d’outils ;
- des adaptateurs de commandes clavier ;
- des sous-menus de déplacement vers une page.

## Utilisation

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'

const { commands, menuItem, runCommand, moveSelectionToPage, otherPages } = useEditorCommands()
```

## Exemple simple

```ts
const { menuItem } = useEditorCommands()

const editMenu = [
  menuItem('edit.undo', '⌘Z'),
  menuItem('edit.redo', '⇧⌘Z'),
  { separator: true },
  menuItem('selection.delete'),
]
```

## Exemples pratiques

### Exécuter directement une commande

```ts
const { runCommand } = useEditorCommands()
runCommand('selection.duplicate')
```

### Construire un sous-menu « Déplacer vers la page »

```ts
const { otherPages, moveSelectionToPage } = useEditorCommands()

const items = otherPages.value.map(page => ({
  label: page.name,
  action: () => moveSelectionToPage(page.id),
}))
```

## Voir aussi

- [useMenuModel](./use-menu-model)
- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)

## Types principaux

```ts
type EditorCommandId =
  | 'edit.undo'
  | 'edit.redo'
  | 'selection.selectAll'
  | 'selection.duplicate'
  | 'selection.delete'
  | 'selection.group'
  | 'selection.ungroup'
  | 'selection.createComponent'
  | 'selection.createComponentSet'
  | 'selection.createInstance'
  | 'selection.detachInstance'
  | 'selection.goToMainComponent'
  | 'selection.wrapInAutoLayout'
  | 'selection.bringToFront'
  | 'selection.sendToBack'
  | 'selection.toggleVisibility'
  | 'selection.toggleLock'
  | 'selection.moveToPage'
  | 'view.zoom100'
  | 'view.zoomFit'
  | 'view.zoomSelection'
```
