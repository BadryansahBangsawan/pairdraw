---
title: useExport
description: Gestionar ajustes de exportación como la escala y el formato de la selección actual.
---

# useExport

`useExport()` es el composable del panel de exportación para los objetos seleccionados.

Gestiona:

- las filas de ajustes de exportación
- los identificadores de los objetos seleccionados
- el nombre que identifica la exportación
- las escalas y los formatos admitidos (identificadores en `formats` y opciones con etiqueta en `formatOptions`)

## Uso

```ts
import { useExport } from '@pairdraw/vue/document/export'

const exportState = useExport()
```

## Ejemplo básico

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

## Ejemplos prácticos

### Añadir otro preajuste de exportación

```ts
exportState.addSetting()
```

### Cambiar la primera exportación a WEBP a 2x

```ts
exportState.updateScale(0, 2)
exportState.updateFormat(0, 'webp')
```

## Véase también

- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)
- [Guía de exportación](/es/user-guide/exporting)
