---
title: useLayout
description: Trabajar con la disposición automática, el tamaño, el relleno, la alineación y las pistas de cuadrícula.
---

# useLayout

`useLayout()` es el composable de controles principal para los paneles relacionados con la disposición.

Expone estado y acciones para:

- modo flex o grid
- tamaño de anchura y altura y dimensiones derivadas editables
- límites de tamaño mínimo y máximo
- relleno
- alineación
- edición de las pistas de la plantilla de cuadrícula

## Uso

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Tamaño por eje

```ts
const {
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()

setAxisSizing('width', 'HUG')
setAxisSizing('height', 'FILL')
```

Conecte `updateAxisSize()` y `commitAxisSize()` a un campo numérico. Editar un valor Hug o Fill cambia solo ese eje a Fixed en la primera modificación real:

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Para confirmar en un solo paso, y deshacer con Escape, un cambio de modo de tamaño, la desvinculación de una variable y el valor numérico, combine NumberField con `BindableValue` usando un proveedor que implemente lotes de interacción. Dar el foco al campo no cambia por sí solo su modo de tamaño.

## Bloqueo de proporción

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` bloquea la capa seleccionada en sus proporciones actuales o la desbloquea. Mientras está bloqueada, `updateAxisSize()` cambia ambos lados. `aspectRatioLockable` es false para una capa dentro de una instancia, que conserva el bloqueo de su componente.

## Límites de tamaño

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Ejemplos prácticos

### Alternar entre la interfaz de relleno común y por lado

```ts
layout.toggleIndividualPadding()
```

### Actualizar las pistas de la cuadrícula

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Cambiar la alineación

```ts
layout.setAlignment('CENTER', 'MAX')
```

Las acciones actualizan la selección mediante la integración con el editor y participan en deshacer.

## Véase también

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)
- [Disposición automática](/es/user-guide/auto-layout)
