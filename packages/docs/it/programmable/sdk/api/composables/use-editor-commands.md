---
title: useEditorCommands
description: Costruire menu, azioni e interfacce basate sui comandi a partire dall'editor.
---

# useEditorCommands

`useEditorCommands()` espone un livello orientato ai comandi sopra le azioni dell'editor.

È utile per costruire:

- menu dell'applicazione
- menu contestuali
- barre degli strumenti
- adattatori per i comandi da tastiera
- sottomenu per spostare elementi tra pagine

## Uso

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'

const { commands, menuItem, runCommand, moveSelectionToPage, otherPages } = useEditorCommands()
```

## Esempio di base

```ts
const { menuItem } = useEditorCommands()

const editMenu = [
  menuItem('edit.undo', '⌘Z'),
  menuItem('edit.redo', '⇧⌘Z'),
  { separator: true },
  menuItem('selection.delete'),
]
```

## Esempi pratici

### Eseguire direttamente un comando

```ts
const { runCommand } = useEditorCommands()
runCommand('selection.duplicate')
```

### Costruire un sottomenu “Sposta nella pagina”

```ts
const { otherPages, moveSelectionToPage } = useEditorCommands()

const items = otherPages.value.map(page => ({
  label: page.name,
  action: () => moveSelectionToPage(page.id),
}))
```

## Vedi anche

- [useMenuModel](./use-menu-model)
- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)

## Tipi principali

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
