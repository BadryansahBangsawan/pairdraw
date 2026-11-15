---
title: FontPickerRoot
description: Selettore di font senza stile con ricerca, basato sul Combobox di Reka UI.
---

# FontPickerRoot

`FontPickerRoot` è un selettore di font senza stile con ricerca, costruito sui componenti Combobox di Reka UI.

## Props

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Sorgente asincrona delle famiglie di font disponibili.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Classe facoltativa per il pulsante predefinito.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Classe facoltativa per il contenuto del menu a discesa.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Classe facoltativa per le voci predefinite.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Classe facoltativa per il campo di ricerca.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Classe facoltativa per l’area scorrevole.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Classe facoltativa per gli stati vuoti.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Testo mostrato quando la ricerca non trova font.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Testo mostrato quando non ci sono font disponibili.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Testo di aiuto facoltativo per lo stato senza font.' }
  ]"
/>

## Modello

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Famiglia di font selezionata.', required: true }
  ]"
/>

## Eventi

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Emesso dopo la selezione di una famiglia di font.' }
  ]"
/>

## Slot

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Contenuto personalizzato del pulsante.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Slot per un campo di ricerca personalizzato.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Disegno personalizzato delle voci.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Indicatore personalizzato della voce selezionata.' },
    { name: 'empty', description: 'Mostrato quando non ci sono font disponibili.' }
  ]"
/>

## Esempio

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## Vedi anche

- [useTypography](../composables/use-typography)
