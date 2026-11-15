---
title: FontPickerRoot
description: Компонент выбора шрифта с поиском на основе Reka UI Combobox.
---

# FontPickerRoot

`FontPickerRoot` — компонент выбора шрифта с поиском без встроенного оформления, построенный на примитивах Combobox из Reka UI. Приложение может заменить кнопку открытия, поле поиска, строки списка, отметку выбора и пустое состояние через слоты.

## Props

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Асинхронный источник доступных семейств шрифтов.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Необязательный класс стандартной кнопки открытия.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Необязательный класс содержимого списка.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Необязательный класс строк списка.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Необязательный класс поля поиска.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Необязательный класс прокручиваемой области.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Необязательный класс пустого состояния.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Текст, когда поиск не дал результатов.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Текст, когда шрифты недоступны.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Дополнительная подсказка при отсутствии шрифтов.' }
  ]"
/>

## Model

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Выбранное семейство шрифта.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Вызывается после выбора семейства.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Собственное содержимое кнопки открытия.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Собственное поле поиска.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Собственная отрисовка строки списка.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Собственная отметка выбора.' },
    { name: 'empty', description: 'Показывается, когда шрифты недоступны.' }
  ]"
/>

## Пример

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## См. также

- [useTypography](../composables/use-typography)
