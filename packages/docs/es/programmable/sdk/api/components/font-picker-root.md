---
title: FontPickerRoot
description: Selector de fuentes sin estilos y con búsqueda, construido sobre Reka Combobox.
---

# FontPickerRoot

`FontPickerRoot` es un selector de fuentes sin estilos y con búsqueda, construido sobre las primitivas Combobox de Reka UI.

## Props

<SdkPropsTable
  :rows="[
    { name: 'listFamilies', type: '() => Promise<string[]>', description: 'Fuente asíncrona de las familias tipográficas disponibles.', required: true },
    { name: 'triggerClass', type: 'string | undefined', description: 'Clase opcional para el disparador predeterminado.' },
    { name: 'contentClass', type: 'string | undefined', description: 'Clase opcional para el contenido desplegable.' },
    { name: 'itemClass', type: 'string | undefined', description: 'Clase opcional para los elementos predeterminados.' },
    { name: 'searchClass', type: 'string | undefined', description: 'Clase opcional para el campo de búsqueda.' },
    { name: 'viewportClass', type: 'string | undefined', description: 'Clase opcional para la zona desplazable.' },
    { name: 'emptyClass', type: 'string | undefined', description: 'Clase opcional para los estados vacíos.' },
    { name: 'emptySearchText', type: 'string | undefined', description: 'Texto que se muestra cuando la búsqueda no devuelve fuentes.' },
    { name: 'emptyFontsText', type: 'string | undefined', description: 'Texto que se muestra cuando no hay fuentes disponibles.' },
    { name: 'emptyFontsHint', type: 'string | undefined', description: 'Texto de ayuda opcional para el estado sin fuentes.' }
  ]"
/>

## Modelo

<SdkPropsTable
  :rows="[
    { name: 'v-model', type: 'string', description: 'Familia tipográfica seleccionada.', required: true }
  ]"
/>

## Eventos

<SdkEventsTable
  :rows="[
    { name: 'select', payload: 'family: string', description: 'Se emite después de seleccionar una familia tipográfica.' }
  ]"
/>

## Ranuras

<SdkSlotsTable
  :rows="[
    { name: 'trigger', props: '{ value: string, open: boolean }', description: 'Contenido personalizado del disparador.' },
    { name: 'search', props: '{ searchTerm: string, setInputRef: (el: HTMLInputElement | null) => void }', description: 'Ranura para un campo de búsqueda personalizado.' },
    { name: 'item', props: '{ family: string, selected: boolean }', description: 'Representación personalizada de cada elemento.' },
    { name: 'indicator', props: '{ selected: boolean }', description: 'Indicador de selección personalizado.' },
    { name: 'empty', description: 'Se muestra cuando no hay fuentes disponibles.' }
  ]"
/>

## Ejemplo

```vue
<FontPickerRoot v-model="fontFamily" :list-families="listFamilies">
  <template #trigger="{ value }">
    <button class="w-full truncate">{{ value }}</button>
  </template>
</FontPickerRoot>
```

## Véase también

- [useTypography](../composables/use-typography)
- [useFontPicker](../advanced/use-font-picker)
