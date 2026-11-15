---
title: useFillControls
description: Composable del panel de rellenos con un comportamiento de relleno predeterminado.
---

# useFillControls

`useFillControls()` es el composable de la propiedad de relleno que usan las interfaces de edición de rellenos.

Añade un valor de relleno predeterminado reutilizable.

## Uso

```ts
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fills = useFillControls()
```

## Qué proporciona

Expone:

- `defaultFill`

## Ejemplos prácticos

### Añadir una fila de relleno nueva

```ts
propertyList.add(fills.defaultFill)
```

## Véase también

- [PropertyListRoot](../components/property-list-root)
- [useColorVariableBinding](../advanced/use-color-variable-binding)
