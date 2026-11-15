---
title: PropertyList
description: Structure de liste sans styles, typée précisément, pour les remplissages, contours et effets.
---

<script setup lang="ts">
import { data } from '#docs-api/components/property-list.data'
</script>

# PropertyList

PropertyList est un composant de liste contrôlé et sans styles pour les remplissages, les contours et les effets. Le discriminant `propKey` donne aux emplacements et aux actions les types exacts `Fill`, `Stroke` ou `Effect`. Les modifications de l’éditeur et le comportement d’annulation restent dans `useEditorPropertyList()` ou dans un adaptateur de l’application.

## Anatomie

- `PropertyListRoot` — éléments contrôlés, identité, état mixte et événements sémantiques
- `PropertyListItem` — type exact de l’élément, plus `data-hidden` et `data-dragging`
- `PropertyListAdd` — ajoute un élément typé
- `PropertyListRemove` — supprime un élément par son indice
- `PropertyListVisibility` — bascule la visibilité d’un élément par son indice et expose `aria-pressed`

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

Consultez la [démo de PropertySection](/programmable/sdk/api/components/property-section) pour la matrice d’états interactifs partagée.

## Adaptateur de l’éditeur

Les panneaux de Pairdraw utilisent `useEditorPropertyList(propKey)` pour relier les événements contrôlés à la sélection, aux mises à jour de plusieurs objets, au regroupement des annulations et au réordonnancement. Les applications tierces qui utilisent le SDK peuvent fournir leur propre adaptateur d’état, sans contexte d’éditeur Pairdraw.

## Référence API générée

<SdkComponentAPI :components="data.components" />
