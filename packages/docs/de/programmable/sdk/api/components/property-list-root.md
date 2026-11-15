---
title: PropertyList
description: Präzise typisierte Listenstruktur ohne vorgegebenes Erscheinungsbild für Füllungen, Konturen und Effekte.
---

<script setup lang="ts">
import { data } from '#docs-api/components/property-list.data'
</script>

# PropertyList

PropertyList ist eine gesteuerte Listenkomponente ohne vorgegebenes Erscheinungsbild für Füllungen, Konturen und Effekte. Der Diskriminator `propKey` gibt Slots und Aktionen die genauen Typen `Fill`, `Stroke` oder `Effect`. Änderungen am Editor und das Verhalten beim Rückgängigmachen bleiben in `useEditorPropertyList()` oder einem Adapter der Anwendung.

## Aufbau

- `PropertyListRoot` — gesteuerte Einträge, Identität, gemischter Zustand und semantische Ereignisse
- `PropertyListItem` — genauer Eintragstyp sowie `data-hidden` und `data-dragging`
- `PropertyListAdd` — fügt einen typisierten Eintrag hinzu
- `PropertyListRemove` — entfernt einen Eintrag anhand seines Index
- `PropertyListVisibility` — schaltet die Sichtbarkeit eines Eintrags anhand seines Index um und stellt `aria-pressed` bereit

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

Die gemeinsame interaktive Zustandsmatrix zeigt die [Demo von PropertySection](/programmable/sdk/api/components/property-section).

## Editor-Adapter

Die Panels von Pairdraw verbinden gesteuerte Ereignisse über `useEditorPropertyList(propKey)` mit Auswahl, Aktualisierung mehrerer Objekte, Zusammenfassung von Rückgängig-Schritten und Neuanordnung. Nutzer des SDK können ohne Editorkontext von Pairdraw einen eigenen Zustandsadapter bereitstellen.

## Generierte API-Referenz

<SdkComponentAPI :components="data.components" />

## Siehe auch

- [PropertyListItem](./property-list-item)
- [usePropertyList](../advanced/use-property-list)
