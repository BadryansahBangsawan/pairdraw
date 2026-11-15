---
title: GradientEditorRoot
description: Komponent bazowy bez narzuconego wyglądu do edycji punktów gradientu.
---

# GradientEditorRoot

`GradientEditorRoot` to komponent bazowy bez narzuconego wyglądu do edycji gradientów.

Odpowiada za:

- stan aktywnego punktu;
- przełączanie rodzaju gradientu;
- logikę dodawania, usuwania i aktualizacji punktów;
- edycję koloru aktywnego punktu;
- wyprowadzone tło paska gradientu.

## Właściwości

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Bieżąca wartość wypełnienia gradientem.', required: true }
  ]"
/>

## Zdarzenia

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Emitowane, gdy wypełnienie gradientem się zmienia.' }
  ]"
/>

## Sloty

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'stan edytora + funkcje obsługi', description: 'Pełny kontrakt renderowania edytora gradientu.' }
  ]"
/>

### Właściwości slotu domyślnego

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

## Przykład

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

## Zobacz też

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)
