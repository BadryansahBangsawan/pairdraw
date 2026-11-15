---
title: useOkHCL
description: Guardar la intención OkHCL de los rellenos y contornos de los objetos seleccionados.
---

# useOkHCL

`useOkHCL()` es el adaptador, consciente del editor, para los metadatos OkHCL de rellenos y contornos. Lee la intención de color almacenada, actualiza los objetos con soporte de deshacer, informa de la gama en la vista previa y recuerda el formato de campo elegido para cada relleno o contorno.

Use [`useColorModel()`](/programmable/sdk/api/composables/use-color-model) para la conversión independiente del framework, la edición de canales y la presentación de los controles deslizantes. Use `useOkHCL()` solo donde esas ediciones deban guardarse en un editor de Pairdraw.

## Uso

```ts
import { useOkHCL } from '@pairdraw/vue/controls/okhcl'

const okhcl = useOkHCL()

const color = okhcl.getFillOkHCLColor(node, 0)
okhcl.updateFillOkHCL(node, 0, { c: 0.2 })
```

## Estado del formato

```ts
const format = okhcl.getFieldFormat(node, 0, 'fill')
okhcl.setFillFieldFormat(node, 0, 'okhcl')
```

Seleccionar `okhcl` inicializa la intención a partir del color RGBA actual del relleno o del contorno. Las `fieldOptions` devueltas sirven para crear un selector de formato.

## Información de la vista previa

```ts
const preview = okhcl.getFillPreviewInfo(node, 0)
// { previewColorSpace, clipped }
```

La información de la vista previa refleja el espacio de color de renderizado del documento y si la intención OkHCL almacenada necesitó un ajuste de gama.

## Valores devueltos

- `getFillOkHCLColor()` / `getStrokeOkHCLColor()`
- `getFillPreviewInfo()` / `getStrokePreviewInfo()`
- `getFieldFormat()`
- `setFillFieldFormat()` / `setStrokeFieldFormat()`
- `updateFillOkHCL()` / `updateStrokeOkHCL()`
- `fieldOptions`

## Véase también

- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [useFillControls](../composables/use-fill-controls)
- [useStrokeControls](../composables/use-stroke-controls)
- [ColorPickerRoot](../components/color-picker-root)
