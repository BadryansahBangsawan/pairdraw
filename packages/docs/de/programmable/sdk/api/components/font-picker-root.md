---
title: FontPickerRoot
description: Schriftauswahl mit Suche ohne vorgegebenes Erscheinungsbild auf Grundlage von Reka UI Combobox.
---

# FontPickerRoot

`FontPickerRoot` ist eine Schriftauswahl mit Suche ohne vorgegebenes Erscheinungsbild, aufgebaut auf den Combobox-Komponenten von Reka UI. Die Anwendung kann Schaltfläche, Suchfeld, Einträge, Auswahlmarkierung und Leerdarstellung über Slots ersetzen.

## Props

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Asynchrone Quelle der verfügbaren Schriftfamilien.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Optionale Klasse für die Standardschaltfläche.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Optionale Klasse für den Inhalt der Auswahlliste.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Optionale Klasse für die Standardeinträge.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Optionale Klasse für das Suchfeld.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Optionale Klasse für den scrollbaren Bereich.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Optionale Klasse für leere Zustände.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Text, wenn die Suche keine Schriften findet.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Text, wenn keine Schriften verfügbar sind.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Optionaler Hinweistext für den Zustand ohne Schriften.' }
  ]"
/>

## Model

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Ausgewählte Schriftfamilie.', required: true }
  ]"
/>

## Events

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Wird ausgegeben, nachdem eine Schriftfamilie ausgewählt wurde.' }
  ]"
/>

## Slots

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Eigener Inhalt der Schaltfläche.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Slot für ein eigenes Suchfeld.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Eigene Darstellung eines Eintrags.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Eigene Markierung der Auswahl.' },
    { name: 'empty', description: 'Wird angezeigt, wenn keine Schriften verfügbar sind.' }
  ]"
/>

## Beispiel

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## Siehe auch

- [useTypography](../composables/use-typography)
