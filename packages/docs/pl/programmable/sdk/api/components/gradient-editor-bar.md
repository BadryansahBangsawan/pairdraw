---
title: GradientEditorBar
description: Przeciągany pasek gradientu bez narzuconego wyglądu do obsługi punktów koloru.
---

# GradientEditorBar

`GradientEditorBar` to komponent przeciąganego paska używany wewnątrz edytorów gradientu.

## Właściwości

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Bieżące punkty gradientu.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Indeks aktywnego punktu.', required: true },
    { name: 'barBackground', type: 'string', description: 'Wartość CSS background dla paska.', required: true }
  ]"
/>

## Zdarzenia

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Emitowane po wybraniu punktu.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Emitowane podczas przeciągania punktu.' }
  ]"
/>

## Sloty

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'stan paska + funkcje przeciągania', description: 'Pełny kontrakt renderowania paska gradientu.' }
  ]"
/>

### Właściwości slotu domyślnego

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

## Przykład

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

## Zobacz też

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)
