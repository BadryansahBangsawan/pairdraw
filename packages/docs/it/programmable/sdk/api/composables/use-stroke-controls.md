---
title: useStrokeControls
description: Stato e azioni del pannello dei contorni per allineamento, lati, terminazioni, giunzioni e limite di smusso.
---

# useStrokeControls

`useStrokeControls()` è il composable delle proprietà del contorno usato dai pannelli di modifica dei contorni.

Fornisce:

- le opzioni di allineamento del contorno
- preimpostazioni dei lati come tutti, sopra, sotto, sinistra, destra e personalizzato
- i dati del contorno predefinito
- funzioni per lo spessore del bordo su ciascun lato
- lo stato di terminazione, giunzione e limite di smusso con selezioni miste
- aggiornamenti di terminazione e giunzione raggruppati in un'unica operazione di annullamento
- azioni di anteprima e conferma per i campi del limite di smusso

## Uso

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Esempio di base

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Esempi pratici

### Impostare l'allineamento del contorno

```ts
strokes.updateAlign('INSIDE')
```

### Limitare un contorno a un solo lato

```ts
strokes.selectSide('TOP')
```

### Modificare la geometria del contorno

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` è true solo quando ogni nodo selezionato ha almeno un contorno. `cap`, `join` e `miterLimit` restituiscono il valore comune oppure `MIXED` per una selezione mista.

Allineamento, lati e spessori del bordo agiscono su tutti i nodi selezionati in un solo passo di annullamento. `currentAlign()` e `borderWeight(side)` restituiscono il valore comune oppure `MIXED`; un nodo senza contorni viene considerato con l'allineamento che conserva per i nuovi contorni.

## Vedi anche

- [PropertyListRoot](../components/property-list-root)
