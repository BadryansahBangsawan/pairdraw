---
title: GradientEditorBar
description: Barra trascinabile senza stile per i punti di una sfumatura.
---

# GradientEditorBar

`GradientEditorBar` è la barra trascinabile usata all'interno degli editor di sfumature.

## Props

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Punti correnti della sfumatura.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Indice del punto attivo.', required: true },
    { name: 'barBackground', type: 'string', description: 'Stringa CSS dello sfondo della barra.', required: true }
  ]"
/>

## Eventi

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Emesso quando viene selezionato un punto.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Emesso durante il trascinamento di un punto.' }
  ]"
/>

## Slot

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'stato della barra + gestori del trascinamento', description: 'Contratto completo per disegnare la barra della sfumatura.' }
  ]"
/>

### Props dello slot predefinito

```ts
{
  stops: GradientStop[]
  activeStopIndex: number
  barBackground: string
  barRef: (el: unknown) => void
  onStopPointerDown: (index: number, event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: () => void
  draggingIndex: number | null
}
```

## Esempio

```vue
<GradientEditorBar
  :stops="stops"
  :active-stop-index="activeStopIndex"
  :bar-background="barBackground"
  @select-stop="selectStop"
  @drag-stop="dragStop"
  v-slot="ctx"
>
  <MyGradientBar v-bind="ctx" />
</GradientEditorBar>
```

## Vedi anche

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)
