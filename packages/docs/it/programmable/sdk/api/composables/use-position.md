---
title: usePosition
description: Leggere e aggiornare posizione, dimensione, rotazione, allineamento e capovolgimento dei nodi selezionati.
---

# usePosition

`usePosition()` è un composable per le interfacce legate alla posizione.

Espone valori dei nodi selezionati come:

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` e `rotation` si leggono come li mostra il pannello delle proprietà di Figma: l'angolo in alto a sinistra del riquadro del livello ruotato nell'area di lavoro, misurato dal suo frame o dalla pagina, e il suo angolo di rotazione in senso antiorario. `updateProp('x' | 'y' | 'rotation', value)` sposta o ruota ogni nodo selezionato in modo che mostri quel valore, ruotandolo attorno al centro. `panelProp(key)` restituisce il valore comune a una selezione multipla, oppure `MIXED`.

e azioni come:

- allineare
- capovolgere
- ruotare
- trascinare o aggiornare le proprietà numeriche

## Uso

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Esempio di base

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Esempi pratici

### Allineare i nodi selezionati

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Capovolgere la selezione

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Ruotare la selezione

```ts
position.rotate(90)
```

## Vedi anche

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
