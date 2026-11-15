---
title: FontPickerRoot
description: Wybór czcionki z wyszukiwaniem, bez narzuconego wyglądu, oparty na Reka UI Combobox.
---

# FontPickerRoot

`FontPickerRoot` to komponent wyboru czcionki z wyszukiwaniem, bez narzuconego wyglądu, zbudowany na komponentach Combobox z Reka UI.

## Właściwości

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Asynchroniczne źródło dostępnych rodzin czcionek.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Opcjonalna klasa domyślnego przycisku otwierającego.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Opcjonalna klasa zawartości listy rozwijanej.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Opcjonalna klasa domyślnych pozycji.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Opcjonalna klasa pola wyszukiwania.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Opcjonalna klasa przewijanego obszaru.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Opcjonalna klasa pustych stanów.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Tekst wyświetlany, gdy wyszukiwanie nie znajdzie czcionek.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Tekst wyświetlany, gdy nie ma dostępnych czcionek.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Opcjonalna podpowiedź dla stanu bez czcionek.' }
  ]"
/>

## Model

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Wybrana rodzina czcionki.', required: true }
  ]"
/>

## Zdarzenia

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Emitowane po wybraniu rodziny czcionki.' }
  ]"
/>

## Sloty

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Własna zawartość przycisku otwierającego.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Slot własnego pola wyszukiwania.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Własne renderowanie pozycji.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Własny wskaźnik wybranej pozycji.' },
    { name: 'empty', description: 'Wyświetlany, gdy nie ma dostępnych czcionek.' }
  ]"
/>

## Przykład

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## Zobacz też

- [useTypography](../composables/use-typography)
