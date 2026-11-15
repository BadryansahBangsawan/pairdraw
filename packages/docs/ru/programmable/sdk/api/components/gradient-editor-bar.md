---
title: GradientEditorBar
description: Компонент полосы с перетаскиваемыми точками градиента без встроенного оформления.
---

# GradientEditorBar

`GradientEditorBar` — компонент перетаскиваемой полосы, который используется внутри редакторов градиента. Он предоставляет состояние и обработчики указателя для отображения полосы, а также управляет выбором и перетаскиванием точек.

## Props

<SdkPropsTable
  :rows="[
    { name: 'stops', type: 'GradientStop[]', description: 'Текущие точки градиента.', required: true },
    { name: 'activeStopIndex', type: 'number', description: 'Индекс активной точки.', required: true },
    { name: 'barBackground', type: 'string', description: 'CSS-фон полосы.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'selectStop', payload: 'index: number', description: 'Вызывается при выборе точки.' },
    { name: 'dragStop', payload: 'index: number, position: number', description: 'Вызывается во время перетаскивания точки.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'bar state + drag handlers', description: 'Полный контракт отрисовки полосы градиента.' }
  ]"
/>

### Свойства слота по умолчанию

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

## Пример

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

## См. также

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorStop](./gradient-editor-stop)
