---
title: useViewportKind
description: Grobe Kennzeichen für mobile und Desktop-Ansicht in responsiven Editoroberflächen lesen.
---

# useViewportKind

`useViewportKind()` gibt einfache responsive Kennzeichen zurück, die die Editoroberfläche von Pairdraw verwendet.

Verwenden Sie das Composable, wenn Ihre Oberfläche eine schlanke Abstraktion über Breakpoints benötigt, statt `useBreakpoints()` direkt einzurichten.

## Verwendung

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Rückgabewerte

- `isMobile`
- `isDesktop`

## Siehe auch

- [useCanvas](../composables/use-canvas)
