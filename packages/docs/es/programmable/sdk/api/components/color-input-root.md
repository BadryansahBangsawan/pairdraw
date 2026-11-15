---
title: ColorInputRoot
description: Ayudante sin estilos para entradas de color con análisis hexadecimal y funciones de actualización.
---

# ColorInputRoot

`ColorInputRoot` es un ayudante sin estilos para interfaces de entrada de color.

Deriva un valor hexadecimal a partir de un color y expone funciones de actualización para cambios desde el valor hexadecimal y desde el color completo.

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valor de color actual.', required: true },
    { name: 'editable', type: 'boolean | undefined', description: 'Si el consumidor debe presentar el valor como editable.' }
  ]"
/>

## Eventos

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Se emite cuando cambia el color.' }
  ]"
/>

## Ranuras

<SdkSlotsTable
  :rows="[
    { name: 'default', props: '{ color: Color, editable: boolean, hex: string, updateFromHex: (value: string) => void, updateColor: (color: Color) => void }', description: 'Contrato principal para representar la entrada de color.' }
  ]"
/>

## Ejemplo

```vue
<ColorInputRoot :color="color" @update="color = $event" v-slot="{ hex, updateFromHex }">
  <input :value="hex" @input="updateFromHex(($event.target as HTMLInputElement).value)" />
</ColorInputRoot>
```

## Véase también

- [ColorPickerRoot](./color-picker-root)
- [useColorVariableBinding](../advanced/use-color-variable-binding)
