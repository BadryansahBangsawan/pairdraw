---
title: useStrokeControls
description: Stan i działania panelu obwiedni dla wyrównania, boków, zakończeń, połączeń i limitu ostrza.
---

# useStrokeControls

`useStrokeControls()` to composable właściwości obwiedni używany przez panele edycji obwiedni.

Dostarcza:

- warianty wyrównania obwiedni;
- gotowe ustawienia boków: wszystkie, górny, dolny, lewy, prawy, własne;
- domyślne dane obwiedni;
- funkcje pomocnicze dla grubości poszczególnych boków;
- stan zakończeń, połączeń i limitu ostrza przy zaznaczeniu o mieszanych wartościach;
- zmiany zakończeń i połączeń zgrupowane w jednym kroku cofania;
- działania podglądu i zapisu dla pól limitu ostrza.

## Użycie

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Podstawowy przykład

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Praktyczne przykłady

### Ustawienie wyrównania obwiedni

```ts
strokes.updateAlign('INSIDE')
```

### Ograniczenie obwiedni do jednego boku

```ts
strokes.selectSide('TOP')
```

### Edycja geometrii obwiedni

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` ma wartość true tylko wtedy, gdy każdy zaznaczony obiekt ma co najmniej jedną obwiednię. `cap`, `join` i `miterLimit` zwracają wspólną wartość albo `MIXED`, gdy zaznaczenie ma różne wartości.

Wyrównanie, boki i grubości krawędzi zmieniają się na wszystkich zaznaczonych obiektach w jednym kroku cofania. `currentAlign()` i `borderWeight(side)` zwracają wspólną wartość albo `MIXED`; obiekt bez obwiedni liczy się z wyrównaniem, które zachowuje dla nowych obwiedni.

## Zobacz też

- [PropertyListRoot](../components/property-list-root)
