---
title: PropertyList
description: Precyzyjnie typowana anatomia listy bez narzuconego wyglądu dla wypełnień, obwiedni i efektów.
---

<script setup lang="ts">
import { data } from '#docs-api/components/property-list.data'
</script>

# PropertyList

PropertyList to kontrolowany komponent listy bez narzuconego wyglądu dla wypełnień, obwiedni i efektów. Wyróżnik `propKey` nadaje slotom i działaniom dokładne typy `Fill`, `Stroke` lub `Effect`. Zmiany w edytorze i obsługa cofania pozostają w `useEditorPropertyList()` albo w adapterze aplikacji.

## Anatomia

- `PropertyListRoot` — kontrolowane elementy, tożsamość, stan mieszany i zdarzenia semantyczne;
- `PropertyListItem` — dokładny typ elementu oraz `data-hidden` i `data-dragging`;
- `PropertyListAdd` — dodaje typowany element;
- `PropertyListRemove` — usuwa element o podanym indeksie;
- `PropertyListVisibility` — przełącza widoczność elementu o podanym indeksie i udostępnia `aria-pressed`.

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'
import type { Fill } from '@pairdraw/scene-graph'
import { PropertyListItem, PropertyListRemove, PropertyListRoot } from '@pairdraw/vue/primitives/PropertyList'

const fills = ref<Fill[]>([])
</script>

<template>
  <PropertyListRoot
    prop-key="fills"
    :items="fills"
    @remove="fills.splice($event, 1)"
    v-slot="{ items }"
  >
    <PropertyListItem
      v-for="(_, index) in items"
      :key="index"
      prop-key="fills"
      :index="index"
      v-slot="{ item }"
    >
      <span>{{ item?.type }}</span>
      <PropertyListRemove prop-key="fills" :index="index">Remove</PropertyListRemove>
    </PropertyListItem>
  </PropertyListRoot>
</template>
```

Wspólną macierz interaktywnych stanów pokazuje [demo PropertySection](/programmable/sdk/api/components/property-section).

## Adapter edytora

Panele Pairdraw używają `useEditorPropertyList(propKey)`, aby połączyć kontrolowane zdarzenia z zaznaczeniem, aktualizacją wielu obiektów, grupowaniem kroków cofania i zmianą kolejności. Zewnętrzni użytkownicy SDK mogą dostarczyć własny adapter stanu bez kontekstu edytora Pairdraw.

## Wygenerowana dokumentacja API

<SdkComponentAPI :components="data.components" />
