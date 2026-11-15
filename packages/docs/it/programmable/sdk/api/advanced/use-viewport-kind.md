---
title: useViewportKind
description: Leggere indicatori approssimativi di viewport mobile e desktop per contenitori dell'editor reattivi.
---

# useViewportKind

`useViewportKind()` restituisce semplici indicatori reattivi usati dall'interfaccia dell'editor Pairdraw.

Usalo quando il tuo contenitore ha bisogno di una leggera astrazione sui breakpoint invece di collegare direttamente `useBreakpoints()`.

## Uso

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Valori restituiti

- `isMobile`
- `isDesktop`

## Vedi anche

- [useCanvas](../composables/use-canvas)
