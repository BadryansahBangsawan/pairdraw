---
title: FontPickerRoot
description: Sélecteur de polices sans styles avec recherche, construit sur Reka Combobox.
---

# FontPickerRoot

`FontPickerRoot` est un sélecteur de polices sans styles, avec recherche, construit sur les composants Combobox de Reka UI.

## Propriétés

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Source asynchrone des familles de polices disponibles.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Classe facultative du déclencheur par défaut.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Classe facultative du contenu de la liste déroulante.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Classe facultative des éléments par défaut.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Classe facultative du champ de recherche.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Classe facultative de la zone de défilement.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Classe facultative des états vides.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Texte affiché quand la recherche ne trouve aucune police.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Texte affiché quand aucune police n’est disponible.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Texte d’aide facultatif pour l’état sans polices.' }
  ]"
/>

## Modèle

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Famille de polices sélectionnée.', required: true }
  ]"
/>

## Événements

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Émis après la sélection d’une famille de polices.' }
  ]"
/>

## Emplacements

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Contenu personnalisé du déclencheur.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Emplacement pour un champ de recherche personnalisé.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Rendu personnalisé des éléments.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Indicateur de sélection personnalisé.' },
    { name: 'empty', description: 'Affiché quand aucune police n’est disponible.' }
  ]"
/>

## Exemple

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## Voir aussi

- [useTypography](../composables/use-typography)
