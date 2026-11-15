---
title: useAppearance
description: Zarządzanie widocznością, przezroczystością, promieniem i wygładzaniem narożników bieżącego zaznaczenia.
---

# useAppearance

`useAppearance()` to composable sterujący sekcją wyglądu w panelach właściwości.

Wyprowadza z zaznaczenia stan interfejsu dla:

- widoczności;
- przezroczystości;
- promienia narożników;
- wygładzania narożników jako znormalizowanej wartości procentowej;
- niezależnych promieni narożników, w tym zaimportowanych obiektów o nierównych narożnikach;
- trybu mieszania.

## Użycie

```ts
import { useAppearance } from '@pairdraw/vue/controls/appearance'

const appearance = useAppearance()
```

## Podstawowy przykład

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

## Praktyczne przykłady

### Przełączanie widoczności zaznaczenia

```ts
appearance.toggleVisibility()
```

### Edycja promieni poszczególnych narożników

```ts
appearance.updateCornerProp('topLeftRadius', 12)
appearance.commitCornerProp('topLeftRadius', 12, 8)
```

### Edycja wygładzania narożników

```ts
appearance.updateCornerProp('cornerSmoothing', 0.75)
appearance.commitCornerProp('cornerSmoothing', 0.75, 0)
```

O tym, czy pokazać edytor poszczególnych narożników, decyduje `showIndependentCorners`. Wartość uwzględnia zarówno jawną flagę obiektu, jak i zaimportowane obiekty, których narożniki mają różne wartości. Przełączanie i zapis przy zaznaczeniu wielu obiektów tworzą jeden krok cofania.

## Zobacz też

- [Przegląd API SDK](../)
- [useLayout](./use-layout)
- [useTypography](./use-typography)
