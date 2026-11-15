---
title: ColorInputRoot
description: Hilfskomponente ohne vorgegebenes Erscheinungsbild für Farbfelder, mit Hex-Auswertung und Aktualisierungsfunktionen.
---

# ColorInputRoot

`ColorInputRoot` ist eine Hilfskomponente ohne vorgegebenes Erscheinungsbild für Farbeingaben.

Sie leitet aus einer Farbe einen Hexadezimalwert ab und stellt Funktionen zur Aktualisierung aus einem Hexwert oder einem vollständigen `Color`-Objekt bereit.

## Props

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Aktueller Farbwert.', required: true },
    { name: 'editable', type: 'boolean | undefined', description: 'Ob die einbindende Oberfläche den Wert als bearbeitbar darstellen soll.' }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Wird ausgegeben, wenn sich die Farbe ändert.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'default', props: '{ color: Color, editable: boolean, hex: string, updateFromHex: (value: string) => void, updateColor: (color: Color) => void }', description: 'Haupt-Render-Vertrag des Farbfelds.' }
  ]"
/>

## Beispiel

```vue
<ColorInputRoot :color="color" @update="color = $event" v-slot="{ hex, updateFromHex }">
  <input :value="hex" @input="updateFromHex(($event.target as HTMLInputElement).value)" />
</ColorInputRoot>
```

## Siehe auch

- [ColorPickerRoot](./color-picker-root)
