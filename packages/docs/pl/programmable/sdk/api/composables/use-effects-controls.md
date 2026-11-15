---
title: useEffectsControls
description: Funkcje panelu efektów dla cieni, rozmyć, stanu rozwinięcia oraz podglądu i zapisu wartości.
---

# useEffectsControls

`useEffectsControls()` to composable właściwości efektów używany przez panele efektów.

Dostarcza funkcje pomocnicze dla:

- domyślnych efektów;
- logiki rozróżniającej cienie i rozmycia;
- stanu rozwiniętych elementów;
- edycji z podglądem podczas przeciągania;
- zapisu wartości po zakończeniu edycji;
- zmiany rodzaju i koloru efektu.

## Użycie

```ts
import { useEffectsControls } from '@pairdraw/vue/controls/effects'

const effects = useEffectsControls()
```

## Podstawowy przykład

```ts
const { effectOptions, createDefaultEffect, toggleExpand, scrubEffect, commitEffect } = useEffectsControls()
```

## Praktyczne przykłady

### Dodanie domyślnego efektu

```ts
const effect = effects.createDefaultEffect()
```

### Podgląd zmian podczas przeciągania, a potem zapis

```ts
effects.scrubEffect(node, index, { radius: 12 })
effects.commitEffect(node, index, { radius: 12 })
```

## Zobacz też

- [PropertyListRoot](../components/property-list-root)
