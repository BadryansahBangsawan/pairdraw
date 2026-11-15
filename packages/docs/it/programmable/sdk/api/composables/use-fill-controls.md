---
title: useFillControls
description: Composable del pannello dei riempimenti con il comportamento del riempimento predefinito.
---

# useFillControls

`useFillControls()` è il composable delle proprietà di riempimento usato dalle interfacce che modificano i riempimenti.

Aggiunge un valore di riempimento predefinito riutilizzabile.

## Uso

```ts
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fills = useFillControls()
```

## Cosa fornisce

Espone:

- `defaultFill`

## Esempi pratici

### Aggiungere una nuova riga di riempimento

```ts
propertyList.add(fills.defaultFill)
```

## Vedi anche

- [PropertyListRoot](../components/property-list-root)
