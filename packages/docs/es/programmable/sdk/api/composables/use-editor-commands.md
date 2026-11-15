---
title: useEditorCommands
description: Crear menús, acciones e interfaces basadas en comandos sobre el editor.
---

# useEditorCommands

`useEditorCommands()` expone una capa orientada a comandos sobre las acciones del editor.

Resulta útil para crear:

- menús de la aplicación
- menús contextuales
- barras de herramientas
- adaptadores de comandos de teclado
- submenús para mover a otra página

## Uso

```ts
import { useEditorCommands } from '@pairdraw/vue/editor/commands'

const { commands, menuItem, runCommand, moveSelectionToPage, otherPages } = useEditorCommands()
```

## Ejemplo básico

```ts
const { menuItem } = useEditorCommands()

const editMenu = [
  menuItem('edit.undo', '⌘Z'),
  menuItem('edit.redo', '⇧⌘Z'),
  { separator: true },
  menuItem('selection.delete'),
]
```

## Ejemplos prácticos

### Ejecutar un comando directamente

```ts
const { runCommand } = useEditorCommands()
runCommand('selection.duplicate')
```

### Crear un submenú «mover a página»

```ts
const { otherPages, moveSelectionToPage } = useEditorCommands()

const items = otherPages.value.map(page => ({
  label: page.name,
  action: () => moveSelectionToPage(page.id),
}))
```

Use el registro compartido para que las barras, los menús contextuales y los menús de la aplicación muestren los mismos atajos y respeten las mismas reglas.

## Véase también

- [useMenuModel](./use-menu-model)
- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)
- [useSelectionCapabilities](./use-selection-capabilities)

## Tipos principales

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
