---
title: usePosition
description: Чтение и изменение положения, размера, поворота, выравнивания и отражения выделенного объекта.
---

# usePosition

`usePosition()` предоставляет панелям положения и размера значения выбранного объекта:

- `x`
- `y`
- `width`
- `height`
- `rotation`

`x`, `y` и `rotation` читаются так, как их показывает панель свойств Figma: левый верхний угол рамки повёрнутого слоя на холсте, отсчитанный от его фрейма или страницы, и угол поворота против часовой стрелки. `updateProp('x' | 'y' | 'rotation', value)` перемещает или поворачивает каждый выделенный объект вокруг его центра так, чтобы он показывал это значение. `panelProp(key)` возвращает общее значение для нескольких выделенных объектов или `MIXED`.

и действия:

- выравнивание;
- отражение;
- поворот;
- предварительное и окончательное изменение числовых свойств.

## Использование

```ts
import { usePosition } from '@pairdraw/vue/controls/position'

const position = usePosition()
```

## Пример

```ts
const { x, y, width, height, rotation, updateProp, commitProp } = usePosition()
```

## Примеры

### Выровнять выделенные объекты

```ts
position.align('horizontal', 'center')
position.align('vertical', 'min')
```

### Отразить выделение

```ts
position.flip('horizontal')
position.flip('vertical')
```

### Повернуть выделение

```ts
position.rotate(90)
```

## Связанные API

- [useLayout](./use-layout)
- [useAppearance](./use-appearance)
