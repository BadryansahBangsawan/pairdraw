---
title: GradientEditorRoot
description: Primitiva raíz sin estilos para editar los puntos de un degradado.
---

# GradientEditorRoot

`GradientEditorRoot` es una primitiva raíz sin estilos para editar degradados.

Se encarga de:

- el estado del punto activo
- el cambio de subtipo
- la lógica para añadir, quitar y actualizar puntos
- la edición del color activo
- el fondo derivado de la barra

## Props

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Valor actual del relleno de degradado.', required: true }
  ]"
/>

## Eventos

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Se emite cuando cambia el relleno de degradado.' }
  ]"
/>

## Ranuras

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'editor state + handlers', description: 'Contrato completo para representar el editor de degradados.' }
  ]"
/>

### Props de la ranura predeterminada

```ts
{
  stops: GradientStop[]
  subtype: GradientSubtype
  subtypes: Array<{ value: GradientSubtype; label: string }>
  activeStopIndex: number
  activeColor: Color
  barBackground: string
  setSubtype: (type: GradientSubtype) => void
  selectStop: (index: number) => void
  addStop: () => void
  removeStop: (index: number) => void
  updateStopPosition: (index: number, position: number) => void
  updateStopColor: (index: number, hex: string) => void
  updateStopOpacity: (index: number, opacity: number) => void
  updateActiveColor: (color: Color) => void
  dragStop: (index: number, position: number) => void
}
```

## Ejemplo

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

La aplicación puede componer [GradientEditorBar](./gradient-editor-bar) y [GradientEditorStop](./gradient-editor-stop) en su ranura.

## Véase también

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)
- [useGradientStops](../advanced/use-gradient-stops)
