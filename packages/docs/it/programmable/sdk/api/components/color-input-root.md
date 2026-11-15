---
title: ColorInputRoot
description: Supporto senza stile per un campo colore, con lettura del valore esadecimale e funzioni di aggiornamento.
---

# ColorInputRoot

`ColorInputRoot` è un supporto senza stile per le interfacce di inserimento del colore.

Ricava un valore esadecimale dal colore e fornisce funzioni per aggiornarlo da una stringa esadecimale o da un colore completo.

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valore del colore corrente.', required: true },
    { name: 'editable', type: 'boolean | undefined', description: 'Indica se chi usa il componente deve presentare il valore come modificabile.' }
  ]"
/>

## Eventi

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Emesso quando il colore cambia.' }
  ]"
/>

## Slot

<SdkSlotsTable
  :rows="[
    { name: 'default', props: '{ color: Color, editable: boolean, hex: string, updateFromHex: (value: string) => void, updateColor: (color: Color) => void }', description: 'Contratto principale per disegnare il campo colore.' }
  ]"
/>

## Esempio

```vue
<ColorInputRoot :color="color" @update="color = $event" v-slot="{ hex, updateFromHex }">
  <input :value="hex" @input="updateFromHex(($event.target as HTMLInputElement).value)" />
</ColorInputRoot>
```

## Vedi anche

- [ColorPickerRoot](./color-picker-root)
