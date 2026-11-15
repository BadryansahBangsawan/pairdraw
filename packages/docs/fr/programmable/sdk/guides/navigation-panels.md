---
title: Panneaux de navigation
description: Panneaux latéraux de pages et de calques avec PageListRoot, LayerTreeRoot et état de sélection.
---

# Panneaux de navigation

Les panneaux latéraux de Pairdraw combinent généralement deux rôles :

- la navigation entre les pages ;
- la navigation dans les calques.

Le SDK Vue fournit des composants sans styles pour ces deux zones.

## Pages

Utilisez `PageListRoot` ou `usePageList()` :

```vue
<PageListRoot v-slot="{ pages, currentPageId, switchPage, addPage }">
  <div>
    <button v-for="page in pages" :key="page.id" @click="switchPage(page.id)">
      {{ page.name }}
    </button>
    <button @click="addPage()">New page</button>
  </div>
</PageListRoot>
```

## Calques

Utilisez `LayerTreeRoot` lorsque le SDK doit gérer la structure de l’arbre et les interactions tandis que l’application définit le balisage et les styles :

```vue
<LayerTreeRoot v-slot="{ items, selectedIds, select, toggleExpand, getKey, getChildren }">
  <TreeView
    :items="items"
    :selected-ids="selectedIds"
    :get-key="getKey"
    :get-children="getChildren"
    @select="select"
    @toggle-expand="toggleExpand"
  />
</LayerTreeRoot>
```

## Disposition courante

Une disposition fréquente comprend :

- pages en haut du panneau ;
- calques en dessous ;
- détails et changement de nom direct dans les composants de ligne.

## Voir aussi

- [usePageList](../api/composables/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/composables/use-selection-state)
