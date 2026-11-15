---
title: useTypography
description: Чтение и изменение шрифта, выравнивания, регистра, усечения и функций OpenType у текстовых объектов.
---

# useTypography

`useTypography()` — composable для свойств текста в панелях редактирования текста. Он работает с текстовыми слоями в выделении: `nodes` содержит их, `node` — первый из них, а каждое действие меняет их все одним шагом отмены, поэтому в выделении из текста и других слоёв изменяется только текст.

Он предоставляет:

- семейство шрифта;
- начертание: `faces` — начертания семейства выделенных слоёв под именами, которые дают им их шрифты (у Avenir Book и Roman различаются), прочитанные из установленных шрифтов и у поставщиков веб-шрифтов, а пока начертания семейства неизвестны — все стандартные толщины; `faceName` — общее начертание слоёв или `MIXED`; `setFace(style)` задаёт начертание по имени;
- размер шрифта;
- состояние форматирования;
- сведения об отсутствующих шрифтах;
- горизонтальное и вертикальное выравнивание, включая выравнивание по ширине;
- регистр и направление текста;
- усечение в конце и максимальное число строк;
- переключатели функций OpenType;
- оси вариативных шрифтов (`axes`, `opticalSizeAuto`);
- стиль списка (`listType`, `null`, если абзацы различаются) и выступающие маркеры;
- функции изменения семейства, начертания, толщины, выравнивания и оформления;
- `merged(key)` и `fontFeature(tag)`, которые возвращают общее значение или `MIXED`.

## Использование

```ts
import { useTypography } from '@pairdraw/vue/controls/typography'

const typography = useTypography()
```

## Пример

```ts
const {
  fontFamily,
  fontWeight,
  fontSize,
  activeFormatting,
  setFamily,
  setFace,
  setWeight,
  setAlign,
  setVerticalAlign,
  setTextCase,
  setTruncation,
  setFontFeature,
} = useTypography()
```

## Практические примеры

### Загрузить и выбрать семейство шрифта

```ts
const typography = useTypography({
  fontLoader: {
    load: async (family, style) => {
      await myFontLoader(family, style)
    },
  },
})
```

### Изменить форматирование

Как в Figma, при смене семейства каждый слой сохраняет толщину и наклон, если они есть в новом семействе, а иначе получает ближайшую толщину с тем же наклоном; `toggleBold` и `toggleItalic` не меняют слой, если в его семействе нет такого начертания.

```ts
typography.toggleBold()
typography.toggleItalic()
typography.toggleDecoration('UNDERLINE')
typography.setTextCase('UPPER')
typography.setVerticalAlign('CENTER')
typography.setTruncation('ENDING')
typography.setFontFeature('LIGA', false)
```

### Создать список

Пока текст редактируется, `setListType` и `setParagraphSpacing` меняют абзацы под курсором или в выделении, а иначе — весь текст. `paragraphSpacing(field)` читает `listSpacing`, `paragraphSpacing` или `paragraphIndent` этих абзацев (`MIXED`, если они различаются), а `previewParagraphSpacing` показывает значение во время перетаскивания поля без шага отмены.

```ts
typography.setListType('UNORDERED')
typography.setHangingList(true)
typography.setParagraphSpacing('listSpacing', 8)
```

### Оси вариативных шрифтов

`axes` перечисляет оси вариативного шрифта выделенного текста, каждую с `tag`, `name`, диапазоном и `value`, в котором она рисуется (`MIXED`, если слои различаются); для статического шрифта или слоёв разных семейств список пуст. `previewAxis` показывает значение во время перетаскивания, `setAxis` задаёт его одним шагом отмены, а `setOpticalSizeAuto` включает следование оптического размера за размером шрифта или фиксирует его. Смена толщины, наклона или семейства возвращает оси к значениям начертания.

```ts
typography.setAxis('wght', 560)
typography.setOpticalSizeAuto(false)
```

## Связанные API

- [useTextEdit](./use-text-edit)
- [useSelectionState](./use-selection-state)
