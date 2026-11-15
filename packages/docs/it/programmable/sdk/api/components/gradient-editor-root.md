---
title: GradientEditorRoot
description: Componente radice senza stile per modificare i punti di una sfumatura.
---

# GradientEditorRoot

`GradientEditorRoot` è un componente radice senza stile per modificare le sfumature.

Gestisce:

- lo stato del punto attivo
- il cambio di sottotipo
- l'aggiunta, la rimozione e l'aggiornamento dei punti
- la modifica del colore attivo
- lo sfondo calcolato della barra

## Props

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Valore corrente del riempimento a sfumatura.', required: true }
  ]"
/>

## Eventi

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Emesso quando il riempimento a sfumatura cambia.' }
  ]"
/>

## Slot

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'stato dell’editor + gestori', description: 'Contratto completo per disegnare l’editor della sfumatura.' }
  ]"
/>

### Props dello slot predefinito

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

## Esempio

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

## Vedi anche

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)
