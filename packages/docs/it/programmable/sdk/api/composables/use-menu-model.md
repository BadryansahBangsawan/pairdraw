---
title: useMenuModel
description: Costruire i modelli dei menu dell'applicazione e dell'area di lavoro a partire dallo stato corrente dell'editor.
---

# useMenuModel

`useMenuModel()` costruisce strutture di menu di livello più alto sopra i comandi dell'editor e lo stato della selezione.

È utile quando vuoi gruppi di menu pronti da disegnare invece di comporre i comandi a mano.

## Uso

```ts
import { useMenuModel } from '@pairdraw/vue/editor/menu-model'

const { appMenu, canvasMenu, selectionLabelMenu } = useMenuModel()
```

## Esempio di base

```ts
const { canvasMenu } = useMenuModel()
```

Disegna `canvasMenu.value` nel tuo componente di menu contestuale.

## Esempi pratici

### Menu superiore in stile applicazione

`appMenu` raggruppa le voci in:

- Modifica
- Visualizza
- Oggetto
- Disponi

### Menu contestuale con spostamento tra pagine

`canvasMenu` include voci dinamiche come “Sposta nella pagina”, in base alla selezione corrente e alle pagine disponibili.

### Etichette della selezione

`selectionLabelMenu` espone etichette che dipendono dal contesto, come:

- `Hide` / `Show`
- `Lock` / `Unlock`

Nell'interfaccia italiana queste etichette compaiono come «Nascondi» / «Mostra» e «Blocca» / «Sblocca».

## Vedi anche

- [useEditorCommands](./use-editor-commands)
- [useSelectionState](./use-selection-state)
- [useSelectionCapabilities](./use-selection-capabilities)
