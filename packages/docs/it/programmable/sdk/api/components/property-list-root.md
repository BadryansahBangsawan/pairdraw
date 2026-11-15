---
title: PropertyList
description: Struttura di elenco senza stile e con tipi precisi per riempimenti, contorni ed effetti.
---

<script setup lang="ts">
import { data } from '#docs-api/components/property-list.data'
</script>

# PropertyList

PropertyList è un elenco controllato e senza stile per riempimenti, contorni ed effetti. Il discriminante `propKey` dà a slot e azioni i tipi esatti `Fill`, `Stroke` o `Effect`. Le modifiche all'editor e il comportamento di annullamento restano in `useEditorPropertyList()` o in un adattatore dell'applicazione.

## Struttura

- `PropertyListRoot`: elementi controllati, identità, stato misto ed eventi semantici
- `PropertyListItem`: tipo esatto dell'elemento più `data-hidden` e `data-dragging`
- `PropertyListAdd`: aggiunge un elemento tipizzato
- `PropertyListRemove`: rimuove l'elemento con un dato indice
- `PropertyListVisibility`: attiva o disattiva la visibilità dell'elemento con un dato indice ed espone `aria-pressed`

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

La matrice condivisa degli stati interattivi è mostrata nella [demo di PropertySection](/programmable/sdk/api/components/property-section).

## Adattatore per l'editor

I pannelli di Pairdraw usano `useEditorPropertyList(propKey)` per collegare gli eventi controllati alla selezione, agli aggiornamenti su più nodi, al raggruppamento delle operazioni di annullamento e al riordino. Chi usa l'SDK al di fuori di Pairdraw può fornire un proprio adattatore di stato senza un contesto dell'editor Pairdraw.

## Riferimento API generato

<SdkComponentAPI :components="data.components" />
