---
title: useAppearance
description: Controllare visibilità, opacità, raggio e smussatura degli angoli della selezione corrente.
---

# useAppearance

`useAppearance()` è il composable dei pannelli delle proprietà dedicato all'aspetto.

Espone lo stato dell'interfaccia derivato dalla selezione per:

- visibilità
- opacità
- raggio degli angoli
- smussatura degli angoli come percentuale normalizzata
- raggi indipendenti per ciascun angolo, compreso lo stato di nodi importati con angoli diversi tra loro
- metodo di fusione

## Uso

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Esempio di base

```ts
const {
  visibilityState,
  opacityPercent,
  cornerRadiusValue,
  cornerSmoothingPercent,
  showIndependentCorners,
  toggleVisibility,
  toggleIndependentCorners,
} = useAppearance()
```

## Esempi pratici

### Mostrare o nascondere la selezione

```ts
appearance.toggleVisibility()
```

### Modificare il raggio di ciascun angolo

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Modificare la smussatura degli angoli

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Disegna l'editor dei singoli angoli a partire da `showIndependentCorners`. Questo stato tiene conto sia del flag esplicito sul nodo della scena sia dei nodi importati con valori degli angoli diversi. Le attivazioni e le conferme su una selezione multipla vengono raggruppate in un'unica voce di annullamento.

## Vedi anche

- [Panoramica dell'API dell'SDK](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
