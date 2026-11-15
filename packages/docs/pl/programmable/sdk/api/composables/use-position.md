---
title: usePosition
description: Odczytywanie i zmiana położenia, rozmiaru, obrotu, wyrównania i odbicia zaznaczonego obiektu.
---

# usePosition

`usePosition()` to composable sterujący interfejsem położenia.

Udostępnia wartości zaznaczonego obiektu, takie jak:

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` i `rotation` mają takie wartości, jakie pokazuje panel właściwości Figmy: lewy górny róg ramki obróconej warstwy w obszarze roboczym, mierzony od jej ramki lub strony, oraz kąt obrotu przeciwny do ruchu wskazówek zegara. `updateProp('x' | 'y' | 'rotation', value)` przesuwa lub obraca każdy zaznaczony obiekt tak, by pokazywał tę wartość, obracając go wokół środka. `panelProp(key)` zwraca wartość wspólną dla zaznaczenia wielu obiektów albo `MIXED`.

Udostępnia też działania:

- wyrównywania;
- odbijania;
- obracania;
- podglądu przy przeciąganiu i zmiany właściwości liczbowych.

## Użycie

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Podstawowy przykład

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Praktyczne przykłady

### Wyrównanie zaznaczonych obiektów

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Odbicie zaznaczenia

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Obrót zaznaczenia

```ts
position.rotate(90)
```

## Zobacz też

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
