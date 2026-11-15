---
title: useMenuModel
description: Crear modelos de menú de la aplicación y del lienzo a partir del estado actual del editor.
---

# useMenuModel

`useMenuModel()` crea estructuras de menú de más alto nivel sobre los comandos del editor y el estado de la selección.

Resulta útil cuando quiere grupos de menú listos para representar en lugar de componer los comandos a mano.

## Uso

```ts
import { useMenuModel } from '@pairdraw/vue/editor/menu-model'

const { appMenu, canvasMenu, selectionLabelMenu } = useMenuModel()
```

## Ejemplo básico

```ts
const { canvasMenu } = useMenuModel()
```

Represente `canvasMenu.value` en su componente de menú contextual.

## Ejemplos prácticos

### Menú superior al estilo de una aplicación

`appMenu` agrupa las entradas en:

- Editar
- Ver
- Objeto
- Organizar

### Menú contextual con traslado entre páginas

`canvasMenu` incluye entradas dinámicas como «Mover a página» según la selección actual y las páginas disponibles.

### Etiquetas de la selección

`selectionLabelMenu` expone etiquetas que dependen del contexto, como:

- `Hide` / `Show`
- `Lock` / `Unlock`

Las etiquetas, los atajos, el estado desactivado y la ejecución proceden de una fuente común.

## Véase también

- [useEditorCommands](./use-editor-commands)
- [useSelectionState](./use-selection-state)
- [useSelectionCapabilities](./use-selection-capabilities)
- [Menú contextual](/es/user-guide/context-menu)
