---
title: useOkHCL
description: Zapisywanie intencji koloru OkHCL dla wypełnień i obwiedni zaznaczonych obiektów.
---

# useOkHCL

`useOkHCL()` to adapter świadomy edytora dla metadanych OkHCL wypełnień i obwiedni. Odczytuje zapisaną intencję koloru, aktualizuje obiekty z obsługą cofania, podaje informacje o gamucie podglądu i zapamiętuje wybrany format pola dla każdego wypełnienia lub obwiedni.

Do konwersji niezależnej od frameworka, edycji kanałów i prezentacji suwaków używaj [`useColorModel()`](/programmable/sdk/api/composables/use-color-model). `useOkHCL()` stosuj tylko tam, gdzie te zmiany trzeba zapisać w edytorze Pairdraw.

## Użycie

```ts
import { useOkHCL } from '@pairdraw/vue/controls/okhcl'

const okhcl = useOkHCL()

const color = okhcl.getFillOkHCLColor(node, 0)
okhcl.updateFillOkHCL(node, 0, { c: 0.2 })
```

## Stan formatu

```ts
const format = okhcl.getFieldFormat(node, 0, 'fill')
okhcl.setFillFieldFormat(node, 0, 'okhcl')
```

Wybranie `okhcl` inicjuje intencję na podstawie bieżącego koloru RGBA wypełnienia lub obwiedni. Zwracane `fieldOptions` można wykorzystać do zbudowania selektora formatu.

## Informacje o podglądzie

```ts
const preview = okhcl.getFillPreviewInfo(node, 0)
// { previewColorSpace, clipped }
```

Informacje o podglądzie odzwierciedlają przestrzeń barw renderowania dokumentu oraz to, czy zapisana intencja OkHCL wymagała mapowania do gamutu.

## Zwracane wartości

- `getFillOkHCLColor()` / `getStrokeOkHCLColor()`
- `getFillPreviewInfo()` / `getStrokePreviewInfo()`
- `getFieldFormat()`
- `setFillFieldFormat()` / `setStrokeFieldFormat()`
- `updateFillOkHCL()` / `updateStrokeOkHCL()`
- `fieldOptions`

## Zobacz też

- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)
