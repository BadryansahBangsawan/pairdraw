---
title: GradientEditorBar
description: Ziehbare Verlaufsleiste ohne vorgegebenes Erscheinungsbild für Verlaufspunkte.
---

# GradientEditorBar

`GradientEditorBar` ist die ziehbare Leiste, die innerhalb von Verlaufseditoren verwendet wird. Sie stellt Zustand und Zeigerereignis-Handler zum Rendern der Leiste bereit und übernimmt Auswahl und Ziehen der Verlaufspunkte.

## Props

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Aktuelle Verlaufspunkte.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Index des aktiven Verlaufspunkts.', required: true },
    { name: 'barBackground', type: 'string', description: 'CSS-Hintergrund der Leiste.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Wird ausgegeben, wenn ein Verlaufspunkt ausgewählt wird.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Wird ausgegeben, während ein Verlaufspunkt gezogen wird.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'Zustand der Leiste + Zieh-Handler', description: 'Vollständiger Render-Vertrag der Verlaufsleiste.' }
  ]"
/>

### Props des Standard-Slots

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

## Beispiel

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

## Siehe auch

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)
