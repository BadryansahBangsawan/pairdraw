---
title: useFillControls
description: Composable für Füllungs-Panels mit Standardfüllung.
---

# useFillControls

`useFillControls()` ist das Composable für Füllungseigenschaften, das Oberflächen zum Bearbeiten von Füllungen verwenden.

Es ergänzt einen wiederverwendbaren Standardwert für neue Füllungen.

## Verwendung

```ts
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fills = useFillControls()
```

## Rückgabewert

Es stellt bereit:

- `defaultFill`

## Praktische Beispiele

### Neue Füllungszeile hinzufügen

```ts
propertyList.add(fills.defaultFill)
```

## Siehe auch

- [PropertyListRoot](../components/property-list-root)
