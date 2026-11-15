---
title: useViewportKind
description: Odczyt ogólnych flag widoku mobilnego i komputerowego dla responsywnych powłok edytora.
---

# useViewportKind

`useViewportKind()` zwraca proste flagi responsywności używane przez interfejs edytora Pairdraw.

Użyj go, gdy powłoka potrzebuje lekkiej abstrakcji nad punktami przełamania zamiast bezpośredniego podłączania `useBreakpoints()`.

## Użycie

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Zwracane wartości

- `isMobile`
- `isDesktop`

## Zobacz też

- [useCanvas](../composables/use-canvas)
