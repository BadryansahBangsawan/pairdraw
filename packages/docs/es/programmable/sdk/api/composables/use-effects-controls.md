---
title: useEffectsControls
description: Funciones del panel de efectos para sombras, desenfoques, estado desplegado y flujos de ajuste y confirmación.
---

# useEffectsControls

`useEffectsControls()` es el composable de la propiedad de efectos que usan los paneles de efectos.

Ofrece funciones para:

- efectos predeterminados
- la lógica que distingue sombras y desenfoques
- el estado desplegado de cada elemento
- la edición con vista previa mientras se ajusta un valor
- las actualizaciones que se confirman al terminar
- los cambios de tipo y de color de un efecto

## Uso

```ts
import { useEffectsControls } from '@pairdraw/vue/controls/effects'

const effects = useEffectsControls()
```

## Ejemplo básico

```ts
const { effectOptions, createDefaultEffect, toggleExpand, scrubEffect, commitEffect } = useEffectsControls()
```

## Ejemplos prácticos

### Añadir un efecto predeterminado

```ts
const effect = effects.createDefaultEffect()
```

### Previsualizar los cambios al ajustar y luego confirmarlos

```ts
effects.scrubEffect(node, index, { radius: 12 })
effects.commitEffect(node, index, { radius: 12 })
```

## Véase también

- [PropertyListRoot](../components/property-list-root)
- [useEditorPropertyList](../advanced/use-property-list)
