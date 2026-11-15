---
title: useFillControls
description: Composable panelu wypełnień z domyślną wartością nowego wypełnienia.
---

# useFillControls

`useFillControls()` to composable właściwości wypełnienia używany przez interfejsy edycji wypełnień.

Dodaje wielokrotnego użytku domyślną wartość wypełnienia.

## Użycie

```ts
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fills = useFillControls()
```

## Co udostępnia

Udostępnia:

- `defaultFill`

## Praktyczne przykłady

### Dodanie nowego wiersza wypełnienia

```ts
propertyList.add(fills.defaultFill)
```

## Zobacz też

- [PropertyListRoot](../components/property-list-root)
