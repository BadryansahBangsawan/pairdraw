---
title: GradientEditorRoot
description: Komponente ohne vorgegebenes Erscheinungsbild zum Bearbeiten von Verlaufspunkten.
---

# GradientEditorRoot

`GradientEditorRoot` ist die Wurzelkomponente ohne vorgegebenes Erscheinungsbild für die Bearbeitung von Verläufen.

Sie verwaltet:

- den aktiven Verlaufspunkt
- den Wechsel der Verlaufsart
- das Hinzufügen, Entfernen und Aktualisieren von Punkten
- die Bearbeitung der Farbe des aktiven Punkts
- den abgeleiteten Hintergrund der Verlaufsleiste

Der Standard-Slot erhält alle Daten und Aktionen für eine eigene Verlaufsoberfläche.

## Props

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Aktuelle Verlaufsfüllung.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Wird ausgegeben, wenn sich die Verlaufsfüllung ändert.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'Zustand des Editors + Handler', description: 'Vollständiger Render-Vertrag des Verlaufseditors.' }
  ]"
/>

### Props des Standard-Slots

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

## Beispiel

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

## Siehe auch

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)
