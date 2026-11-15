---
title: ColorInputRoot
description: Assistant sans styles pour un champ de couleur, avec lecture hexadécimale et actions de mise à jour.
---

# ColorInputRoot

`ColorInputRoot` est un assistant sans styles pour les interfaces de saisie de couleur.

Il dérive une valeur hexadécimale d’une couleur et fournit des actions pour la modifier à partir d’une valeur hexadécimale ou d’une couleur complète.

## Propriétés

<SdkPropsTable
  :rows="[
    { name: 'color', type: 'Color', description: 'Valeur de couleur actuelle.', required: true },
    { name: 'editable', type: 'boolean | undefined', description: 'Indique si l’application doit présenter la valeur comme modifiable.' }
  ]"
/>

## Événements

<SdkEventsTable
  :rows="[
    { name: 'update', payload: 'color: Color', description: 'Émis lorsque la couleur change.' }
  ]"
/>

## Emplacements

<SdkSlotsTable
  :rows="[
    { name: 'default', props: '{ color: Color, editable: boolean, hex: string, updateFromHex: (value: string) => void, updateColor: (color: Color) => void }', description: 'Contrat de rendu principal du champ de couleur.' }
  ]"
/>

## Exemple

```vue
<ColorInputRoot :color="color" @update="color = $event" v-slot="{ hex, updateFromHex }">
  <input :value="hex" @input="updateFromHex(($event.target as HTMLInputElement).value)" />
</ColorInputRoot>
```

## Voir aussi

- [ColorPickerRoot](./color-picker-root)
