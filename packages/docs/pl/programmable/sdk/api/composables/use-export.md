---
title: useExport
description: Zarządzanie ustawieniami eksportu, takimi jak skala i format, dla bieżącego zaznaczenia.
---

# useExport

`useExport()` to composable panelu eksportu zaznaczonych obiektów.

Zarządza:

- wierszami ustawień eksportu;
- identyfikatorami zaznaczonych obiektów;
- nazwą eksportu;
- obsługiwanymi skalami i formatami (identyfikatory `formats` i opisane `formatOptions`).

## Użycie

```ts
import { useExport } from '@pairdraw/vue/document/export'

const exportState = useExport()
```

## Podstawowy przykład

```ts
const {
  settings,
  nodeName,
  scales,
  formats,
  formatOptions,
  addSetting,
  updateScale,
  updateFormat,
} = useExport()
```

## Praktyczne przykłady

### Dodatkowy wariant eksportu

```ts
exportState.addSetting()
```

### Zmiana pierwszego eksportu na WEBP w skali 2×

```ts
exportState.updateScale(0, 2)
exportState.updateFormat(0, 'webp')
```

## Zobacz też

- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)
