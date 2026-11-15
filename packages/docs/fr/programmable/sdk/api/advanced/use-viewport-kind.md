---
title: useViewportKind
description: Indicateurs simples mobile et bureau pour une interface d’édition adaptative.
---

# useViewportKind

`useViewportKind()` renvoie les indicateurs adaptatifs simples utilisés par l’interface de l’éditeur Pairdraw.

Utilisez-le lorsque votre interface a besoin d’une abstraction légère des points de rupture plutôt que de configurer directement `useBreakpoints()`.

## Utilisation

```ts
import { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

const { isMobile, isDesktop } = useViewportKind()
```

## Valeurs renvoyées

- `isMobile`
- `isDesktop`

## Voir aussi

- [useCanvas](../composables/use-canvas)
