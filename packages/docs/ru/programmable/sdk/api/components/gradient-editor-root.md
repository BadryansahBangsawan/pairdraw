---
title: GradientEditorRoot
description: Корневой компонент для редактирования точек градиента без встроенного оформления.
---

# GradientEditorRoot

`GradientEditorRoot` — корневой компонент для редактирования градиента без встроенного оформления.

Он отвечает за:

- состояние активной точки;
- переключение типа градиента;
- добавление, удаление и изменение точек;
- изменение цвета активной точки;
- вычисленный фон полосы.

Слот по умолчанию получает весь набор данных и действий, необходимый для собственного интерфейса редактора градиента.

## Props

<SdkPropsTable
  :rows="[
    { name: 'fill', type: 'Fill', description: 'Текущая градиентная заливка.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'fill: Fill', description: 'Вызывается после изменения градиентной заливки.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: 'editor state + handlers', description: 'Полный контракт отрисовки редактора градиента.' }
  ]"
/>

### Свойства слота по умолчанию

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

## Пример

```vue
<GradientEditorRoot :fill="fill" @update="fill = $event" v-slot="ctx">
  <MyGradientUI v-bind="ctx" />
</GradientEditorRoot>
```

## См. также

- [GradientEditorBar](./gradient-editor-bar)
- [GradientEditorStop](./gradient-editor-stop)
