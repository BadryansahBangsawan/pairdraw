---
title: PropertyList
description: Anatomía de lista sin estilos y con tipos precisos para rellenos, contornos y efectos.
---

<script setup lang="ts">
import { data } from '#docs-api/components/property-list.data'
</script>

# PropertyList

PropertyList es una primitiva de lista controlada y sin estilos para rellenos, contornos y efectos. El discriminador `propKey` da a las ranuras y a las acciones los tipos exactos `Fill`, `Stroke` o `Effect`. La modificación del editor y el comportamiento de deshacer quedan en `useEditorPropertyList()` o en un adaptador de la aplicación.

## Anatomía

- `PropertyListRoot`: elementos controlados, identidad, estado mixto y eventos semánticos
- `PropertyListItem`: tipo exacto del elemento, además de `data-hidden` y `data-dragging`
- `PropertyListAdd`: añade un elemento tipado
- `PropertyListRemove`: elimina un elemento por su índice
- `PropertyListVisibility`: alterna la visibilidad de un elemento por su índice y expone `aria-pressed`

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

Consulte la [demo de PropertySection](/programmable/sdk/api/components/property-section) para ver la matriz compartida de estados interactivos.

## Adaptador del editor

Los paneles de Pairdraw usan `useEditorPropertyList(propKey)` para conectar los eventos controlados con la selección, las actualizaciones de varios objetos, la agrupación para deshacer y la reordenación. Los consumidores externos del SDK pueden proporcionar su propio adaptador de estado sin un contexto de editor de Pairdraw.

## Referencia de API generada

<SdkComponentAPI :components="data.components" />

## Véase también

- [PropertyListItem](./property-list-item)
- [usePropertyList](../advanced/use-property-list)
- [Paneles de propiedades](../../guides/property-panels)
