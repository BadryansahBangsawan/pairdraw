---
title: useEffectsControls
description: Funzioni del pannello degli effetti per ombre, sfocature, stato di espansione e flussi di anteprima e conferma.
---

# useEffectsControls

`useEffectsControls()` è il composable delle proprietà degli effetti usato dai pannelli degli effetti.

Fornisce funzioni per:

- gli effetti predefiniti
- la logica che distingue ombre e sfocature
- lo stato di espansione degli elementi
- la modifica con anteprima durante il trascinamento del valore
- gli aggiornamenti confermati al termine
- il cambio di tipo e colore dell'effetto

## Uso

```ts
import { useEffectsControls } from '@pairdraw/vue/controls/effects'

const effects = useEffectsControls()
```

## Esempio di base

```ts
const { effectOptions, createDefaultEffect, toggleExpand, scrubEffect, commitEffect } = useEffectsControls()
```

## Esempi pratici

### Aggiungere un effetto predefinito

```ts
const effect = effects.createDefaultEffect()
```

### Mostrare l'anteprima durante il trascinamento, poi confermare

```ts
effects.scrubEffect(node, index, { radius: 12 })
effects.commitEffect(node, index, { radius: 12 })
```

## Vedi anche

- [PropertyListRoot](../components/property-list-root)
