---
title: Navigations-Panels
description: Seiten- und Ebenen-Panels mit PageListRoot, LayerTreeRoot und Auswahlzustand.
---

# Navigations-Panels

Seitenleisten in Pairdraw verbinden meist zwei Aufgaben:

- Navigation zwischen Seiten;
- Navigation durch Ebenen.

Das Vue SDK stellt für beide Bereiche Komponenten ohne vorgegebenes Erscheinungsbild bereit.

## Seitennavigation

Verwenden Sie `PageListRoot` oder `usePageList()`.

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

## Ebenennavigation

Verwenden Sie `LayerTreeRoot`, wenn das SDK Baumstruktur und Verhalten verwalten soll, während die Anwendung Markup und Gestaltung bestimmt.

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

## Typische Anordnung

Ein verbreitetes Layout:

- Seiten oben in der Seitenleiste;
- Ebenen darunter;
- Details oder Steuerelemente zum direkten Umbenennen in Ihren Zeilenkomponenten.

## Siehe auch

- [usePageList](../api/composables/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/composables/use-selection-state)
