---
title: ColorInputRoot
description: Komponent pomocniczy bez narzuconego wyglądu dla pól koloru, z odczytem wartości szesnastkowej i funkcjami aktualizacji.
---

# ColorInputRoot

`ColorInputRoot` to komponent pomocniczy bez narzuconego wyglądu dla interfejsów wprowadzania koloru.

Przekształca kolor na wartość szesnastkową i udostępnia funkcje aktualizacji z ciągu szesnastkowego albo pełnego obiektu `Color`.

## Właściwości

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Bieżąca wartość koloru.', required: true },
    { name: 'editable', type: 'boolean | undefined', description: 'Czy interfejs powinien przedstawiać wartość jako edytowalną.' }
  ]"
/>

## Zdarzenia

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Emitowane, gdy kolor się zmienia.' }
  ]"
/>

## Sloty

<SdkSlotsTable
  :rows="[
    { name: 'default', props: '{ color: Color, editable: boolean, hex: string, updateFromHex: (value: string) => void, updateColor: (color: Color) => void }', description: 'Główny kontrakt renderowania pola koloru.' }
  ]"
/>

## Przykład

```vue
<ColorInputRoot :color="color" @update="color = $event" v-slot="{ hex, updateFromHex }">
  <input :value="hex" @input="updateFromHex(($event.target as HTMLInputElement).value)" />
</ColorInputRoot>
```

## Zobacz też

- [ColorPickerRoot](./color-picker-root)
