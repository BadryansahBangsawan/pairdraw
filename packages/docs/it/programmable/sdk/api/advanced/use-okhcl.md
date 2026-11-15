---
title: useOkHCL
description: Salvare l'intento OkHCL di riempimenti e contorni dei nodi selezionati.
---

# useOkHCL

`useOkHCL()` è l'adattatore collegato all'editor per i metadati OkHCL di riempimenti e contorni. Legge l'intento di colore salvato, aggiorna i nodi con supporto all'annullamento, riporta le informazioni di gamut dell'anteprima e ricorda il formato del campo scelto per ogni riempimento o contorno.

Usa [`useColorModel()`](/programmable/sdk/api/composables/use-color-model) per la conversione indipendente dal framework, la modifica dei canali e la presentazione dei cursori. Usa `useOkHCL()` solo dove queste modifiche devono essere salvate in un editor Pairdraw.

## Uso

```ts
import { useOkHCL } from '@pairdraw/vue/controls/okhcl'

const okhcl = useOkHCL()

const color = okhcl.getFillOkHCLColor(node, 0)
okhcl.updateFillOkHCL(node, 0, { c: 0.2 })
```

## Stato del formato

```ts
const format = okhcl.getFieldFormat(node, 0, 'fill')
okhcl.setFillFieldFormat(node, 0, 'okhcl')
```

Selezionare `okhcl` inizializza l'intento a partire dal colore RGBA corrente del riempimento o del contorno. Il valore restituito `fieldOptions` serve a costruire un selettore del formato.

## Informazioni sull'anteprima

```ts
const preview = okhcl.getFillPreviewInfo(node, 0)
// { previewColorSpace, clipped }
```

Le informazioni sull'anteprima riportano lo spazio colore di rendering del documento e se l'intento OkHCL salvato ha richiesto una mappatura del gamut.

## Valori restituiti

- `getFillOkHCLColor()` / `getStrokeOkHCLColor()`
- `getFillPreviewInfo()` / `getStrokePreviewInfo()`
- `getFieldFormat()`
- `setFillFieldFormat()` / `setStrokeFieldFormat()`
- `updateFillOkHCL()` / `updateStrokeOkHCL()`
- `fieldOptions`

## Vedi anche

- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)
