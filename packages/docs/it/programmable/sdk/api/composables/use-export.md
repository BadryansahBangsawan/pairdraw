---
title: useExport
description: Gestire impostazioni di esportazione come scala e formato per la selezione corrente.
---

# useExport

`useExport()` è il composable del pannello di esportazione per i nodi selezionati.

Gestisce:

- le righe delle impostazioni di esportazione
- gli id dei nodi selezionati
- il nome usato per l'esportazione
- le scale e i formati supportati (gli id in `formats` e le voci con etichetta in `formatOptions`)

## Uso

```ts
import { useExport } from '@pairdraw/vue/document/export'

const exportState = useExport()
```

## Esempio di base

```ts
const {
  settings,
  nodeName,
  scales,
  formats,
  formatOptions,
  addSetting,
  updateScale,
  updateFormat,
} = useExport()
```

## Esempi pratici

### Aggiungere un'altra impostazione di esportazione

```ts
exportState.addSetting()
```

### Portare la prima esportazione a 2x in WEBP

```ts
exportState.updateScale(0, 2)
exportState.updateFormat(0, 'webp')
```

## Vedi anche

- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)
