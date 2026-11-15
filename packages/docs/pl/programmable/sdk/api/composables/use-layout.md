---
title: useLayout
description: Zarządzanie automatycznym układem, rozmiarem, dopełnieniem, wyrównaniem i ścieżkami siatki.
---

# useLayout

`useLayout()` to główny composable sterujący panelami układu.

Udostępnia stan i działania dla:

- trybu Flex lub Grid;
- sposobu ustalania szerokości i wysokości oraz edytowalnych wymiarów pochodnych;
- minimalnych i maksymalnych limitów rozmiaru;
- dopełnienia (padding);
- wyrównania;
- edycji ścieżek szablonu siatki.

## Użycie

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Rozmiar w osiach

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

Podłącz `updateAxisSize()` i `commitAxisSize()` do pola liczbowego. Edycja wartości Hug lub Fill przełącza na Fixed tylko tę oś i dopiero przy pierwszej faktycznej zmianie:

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Aby zmiana trybu rozmiaru, odłączenie zmiennej i wartość liczbowa zapisywały się w jednym kroku i wycofywały klawiszem Escape, połącz NumberField z [`BindableValue`](/programmable/sdk/api/components/bindable-value), używając dostawcy obsługującego grupy interakcji. Samo ustawienie fokusu w polu nie zmienia trybu rozmiaru.

## Blokada proporcji

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` blokuje zaznaczoną warstwę w jej bieżących proporcjach albo zdejmuje blokadę. Gdy blokada jest włączona, `updateAxisSize()` zmienia oba boki. `aspectRatioLockable` ma wartość false dla warstwy wewnątrz instancji, która zachowuje blokadę swojego komponentu.

## Limity rozmiaru

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Praktyczne przykłady

### Przełączanie między wspólnym a indywidualnym dopełnieniem

```ts
layout.toggleIndividualPadding()
```

### Zmiana ścieżek siatki

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Zmiana wyrównania

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Zobacz też

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)
