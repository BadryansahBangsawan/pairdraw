---
title: Paneles de navegación
description: Crear barras laterales de páginas y capas con PageListRoot, LayerTreeRoot y el estado de la selección.
---

# Paneles de navegación

Las barras laterales de Pairdraw suelen combinar dos funciones:

- la navegación por páginas
- la navegación por capas

El SDK de Vue ofrece primitivas sin estilos para ambas.

## Navegación por páginas

Use `PageListRoot` o `usePageList()`.

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

## Navegación por capas

Use `LayerTreeRoot` cuando quiera que el SDK gestione la estructura del árbol y que la presentación quede a cargo de la aplicación.

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

## Patrón práctico

Una disposición habitual es:

- las páginas en la parte superior de la barra lateral
- las capas debajo
- los detalles o los controles de cambio de nombre en línea integrados en sus componentes de fila

## Véase también

- [usePageList](../api/composables/use-page-list)
- [PageListRoot](../api/components/page-list-root)
- [LayerTreeRoot](../api/components/layer-tree-root)
- [useSelectionState](../api/composables/use-selection-state)
