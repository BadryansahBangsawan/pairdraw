---
title: useAppearance
description: Управление видимостью, прозрачностью, радиусом и сглаживанием углов текущего выделения.
---

# useAppearance

`useAppearance()` — composable для элементов управления внешним видом в панелях свойств.

Он предоставляет вычисленное из выделения состояние интерфейса для:

- видимости;
- прозрачности;
- радиуса углов;
- сглаживания углов в виде нормализованного процента;
- независимых радиусов углов, включая импортированное состояние с разными углами;
- режима наложения.

## Использование

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Базовый пример

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

## Практические примеры

### Переключить видимость выделения

```ts
appearance.toggleVisibility()
```

### Редактировать радиус каждого угла отдельно

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Изменить сглаживание углов

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

Показывайте редактор отдельных углов по `showIndependentCorners`. Он учитывает и явный флаг объекта сцены, и импортированные объекты с разными значениями углов. Переключения и фиксация изменений при выделении нескольких объектов объединяются в одну запись отмены.

## Связанные API

- [Обзор SDK API](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
