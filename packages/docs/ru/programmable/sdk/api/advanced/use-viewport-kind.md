---
title: useViewportKind
description: Реактивные признаки мобильной и настольной области просмотра для собственного интерфейса.
---

# useViewportKind

`useViewportKind()` возвращает упрощённую классификацию размера области просмотра, используемую адаптивным интерфейсом Pairdraw.

Используйте composable, если достаточно различать мобильный и настольный режимы без прямой настройки `useBreakpoints()`.

## Использование

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Возвращаемые значения

- `isMobile`
- `isDesktop`

## См. также

- [useCanvas](../composables/use-canvas)
