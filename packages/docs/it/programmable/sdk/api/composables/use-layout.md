---
title: useLayout
description: Lavorare con layout automatico, dimensionamento, spaziatura interna, allineamento e tracce della griglia.
---

# useLayout

`useLayout()` è il composable principale per i pannelli legati al layout.

Espone stato e azioni per:

- la modalità flex o griglia
- il dimensionamento di larghezza e altezza e le dimensioni derivate modificabili
- i limiti di dimensione minima e massima
- la spaziatura interna
- l'allineamento
- la modifica delle tracce del modello della griglia

## Uso

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Dimensionamento degli assi

```ts
const {
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()

setAxisSizing('width', 'HUG')
setAxisSizing('height', 'FILL')
```

Collega `updateAxisSize()` e `commitAxisSize()` a un campo numerico. Modificare un valore in **Adatta al contenuto** o **Riempi** porta solo quell'asse a **Fisso**, alla prima modifica effettiva:

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Per confermare in un solo passo, o annullare con <kbd>Esc</kbd>, il cambio di modalità di dimensionamento, lo scollegamento della variabile e il valore numerico, componi il NumberField con `BindableValue` usando un provider che implementi i batch di interazione. Dare semplicemente il focus al campo non cambia la sua modalità di dimensionamento.

## Blocco delle proporzioni

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` blocca il livello selezionato sulle proporzioni attuali o lo sblocca. Finché è bloccato, `updateAxisSize()` modifica entrambi i lati. `aspectRatioLockable` è false per un livello all'interno di un'istanza, che mantiene il blocco del proprio componente.

## Limiti di dimensione

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Esempi pratici

### Passare dalla spaziatura interna uniforme a quella per lato

```ts
layout.toggleIndividualPadding()
```

### Aggiornare le tracce della griglia

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Cambiare l'allineamento

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Vedi anche

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)
