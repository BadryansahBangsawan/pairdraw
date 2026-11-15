---
title: useStrokeControls
description: Состояние и действия панели обводок для расположения, сторон, концов, соединений и предела острия.
---

# useStrokeControls

`useStrokeControls()` — composable для свойств обводки, который используют панели редактирования обводок.

Он предоставляет:

- варианты расположения обводки;
- варианты сторон: все, сверху, снизу, слева, справа или произвольная комбинация;
- значение новой обводки по умолчанию;
- функции для толщины на отдельных сторонах;
- состояние концов, соединений и предела острия для смешанного выделения;
- изменение концов и соединений пакетом отмены;
- действия предварительного просмотра и фиксации для полей предела острия.

## Использование

```ts
import { useStrokeControls } from '@pairdraw/vue/controls/stroke'

const strokes = useStrokeControls()
```

## Базовый пример

```ts
const { alignOptions, sideOptions, currentAlign, currentSides, selectSide } = useStrokeControls()
```

## Практические примеры

### Разместить обводку внутри границы объекта

```ts
strokes.updateAlign('INSIDE')
```

### Ограничить обводку одной стороной

```ts
strokes.selectSide('TOP')
```

### Изменить геометрию обводки

```ts
strokes.setCap('ROUND')
strokes.setJoin('BEVEL')

strokes.updateMiterLimit(8)
strokes.commitMiterLimit(8)
```

`advancedActive` равно true, только если у каждого выделенного объекта есть хотя бы одна обводка. `cap`, `join` и `miterLimit` возвращают общее значение или `MIXED` для смешанного выделения.

Расположение, стороны и толщина обводки меняются у всех выделенных объектов одним шагом отмены. `currentAlign()` и `borderWeight(side)` возвращают общее значение или `MIXED`; объект без обводок учитывается с расположением, которое он сохраняет для новых обводок.

## Связанные API

- [PropertyListRoot](../components/property-list-root)
