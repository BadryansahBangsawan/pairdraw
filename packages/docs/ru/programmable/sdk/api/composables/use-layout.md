---
title: useLayout
description: Управление автоматической компоновкой, размерами, отступами, выравниванием и дорожками сетки.
---

# useLayout

`useLayout()` — основной composable для панелей компоновки.

Он предоставляет состояние и действия для:

- выбора между flex и grid;
- режимов ширины и высоты и редактируемых производных размеров;
- минимальных и максимальных пределов размера;
- отступов;
- выравнивания;
- изменения дорожек grid template.

## Использование

```ts
import { useLayout } from '@pairdraw/vue/controls/layout'

const layout = useLayout()
```

## Размеры по осям

```ts
const {
  widthSizing,
  heightSizing,
  setAxisSizing,
  updateAxisSize,
  commitAxisSize,
} = useLayout()

setAxisSizing('width', 'HUG')
setAxisSizing('height', 'FILL')
```

Подключите `updateAxisSize()` и `commitAxisSize()` к числовому полю. Изменение значения Hug или Fill переключает в Fixed только эту ось и только при первом фактическом изменении:

```vue
<NumberFieldRoot
  :model-value="layout.node.value?.width ?? 0"
  @update:model-value="layout.updateAxisSize('width', $event)"
  @commit="(value, previous) => layout.commitAxisSize('width', value, previous)"
/>
```

Чтобы смена режима размера, отсоединение переменной и числовое значение фиксировались одним шагом и откатывались по Escape, объедините NumberField с `BindableValue`, используя поставщика, который поддерживает пакеты взаимодействий. Простое получение фокуса не меняет режим размера поля.

## Фиксация пропорций

```ts
const { aspectRatioLocked, aspectRatioLockable, toggleAspectRatioLock } = useLayout()
```

`toggleAspectRatioLock()` фиксирует выбранный слой в текущих пропорциях или снимает фиксацию. Пока пропорции зафиксированы, `updateAxisSize()` меняет обе стороны. Для слоя внутри экземпляра `aspectRatioLockable` равно false: такой слой сохраняет фиксацию своего компонента.

## Пределы размера

```ts
layout.addSizeLimit('minWidth')
layout.setSizeLimitToCurrent('minWidth')
layout.removeSizeLimit('minWidth')
```

## Практические примеры

### Переключение между единым и раздельным отступом

```ts
layout.toggleIndividualPadding()
```

### Изменить дорожки grid

```ts
layout.updateGridTrack('gridTemplateColumns', 0, { sizing: 'FIXED', value: 240 })
layout.addTrack('gridTemplateRows')
```

### Изменение выравнивания

```ts
layout.setAlignment('CENTER', 'MAX')
```

## Связанные API

- [LayoutControlsRoot](../components/layout-controls-root)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [usePosition](./use-position)
- [useEditor](./use-editor)
