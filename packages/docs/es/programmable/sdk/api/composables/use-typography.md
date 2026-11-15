---
title: useTypography
description: Leer y actualizar la fuente, la alineación, las mayúsculas, el truncado y las funciones OpenType de los objetos de texto.
---

# useTypography

`useTypography()` es el composable de controles de la propiedad de texto para los paneles de edición de texto. Trabaja con las capas de texto de la selección: `nodes` las contiene, `node` es la primera y cada acción las cambia todas en un solo paso de deshacer, así que en una selección de texto y otras capas solo se edita el texto.

Expone:

- la familia tipográfica
- el estilo de fuente: `faces`, las variantes de la familia de las capas seleccionadas con los nombres que les dan sus fuentes (Book y Roman de Avenir por separado), leídas de las fuentes instaladas y de los proveedores de fuentes web, con todos los pesos estándar mientras se desconocen las variantes de una familia; `faceName`, la variante que comparten las capas o `MIXED`; y `setFace(style)`, que fija una variante por su nombre
- el tamaño de fuente
- el estado del formato
- el estado de las fuentes que faltan
- la alineación horizontal y vertical, incluido el justificado
- las mayúsculas y la dirección del texto
- el truncado final y el número máximo de líneas
- los interruptores de funciones OpenType
- los ejes de las fuentes variables (`axes`, `opticalSizeAuto`)
- el estilo de lista (`listType`, `null` cuando los párrafos difieren) y las listas con sangría francesa
- funciones para cambiar la familia, la variante, el peso, la alineación y las decoraciones
- `merged(key)` y `fontFeature(tag)`, que devuelven el valor común o `MIXED`

## Uso

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Ejemplo básico

```ts
const {
  fontFamily,
  fontWeight,
  fontSize,
  activeFormatting,
  setFamily,
  setFace,
  setWeight,
  setAlign,
  setVerticalAlign,
  setTextCase,
  setTruncation,
  setFontFeature,
} = useTypography()
```

## Ejemplos prácticos

### Cargar y cambiar una familia tipográfica

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Alternar el formato

Como en Figma, al cambiar de familia se conservan el peso y la inclinación de cada capa cuando la nueva familia los tiene; si no, se usa el peso más cercano con la misma inclinación, y `toggleBold` o `toggleItalic` no tocan una capa cuya familia no tiene esa variante.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Crear una lista

Mientras se edita el texto, `setListType` y `setParagraphSpacing` cambian los párrafos bajo el cursor o la selección; si no, cambian todo el texto. `paragraphSpacing(field)` lee `listSpacing`, `paragraphSpacing` o `paragraphIndent` de esos párrafos, `MIXED` cuando difieren, y `previewParagraphSpacing` muestra un valor mientras se arrastra un campo, sin paso de deshacer.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Ajustar los ejes de fuentes variables

`axes` enumera los ejes de la fuente variable del texto seleccionado, cada uno con su `tag`, `name`, rango y el `value` con que se dibuja (`MIXED` si las capas difieren); queda vacío con una fuente estática o con capas de familias distintas. `previewAxis` muestra un valor mientras se arrastra un campo, `setAxis` lo fija en un solo paso de deshacer y `setOpticalSizeAuto` hace que el tamaño óptico siga al tamaño de fuente o lo mantiene fijo. Cambiar el peso, la inclinación o la familia devuelve los ejes a los propios del estilo.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Véase también

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
- [TypographyControlsRoot](../components/typography-controls-root)
- [useFontPicker](../advanced/use-font-picker)
- [Edición de texto](/es/user-guide/text-editing)
