---
title: PageListRoot
description: Primitiva estructural sin estilos para interfaces de lista de páginas.
---

# PageListRoot

`PageListRoot` es una primitiva estructural sin estilos para interfaces de lista de páginas.

Proporciona props de ranura para:

- las páginas
- el identificador de la página actual
- la detección de separadores
- acciones de página como crear, cambiar, renombrar y eliminar

## Uso

Úselo cuando quiera la estructura de lista de páginas que proporciona el SDK con una representación y unos estilos propios de la aplicación.

## Ejemplo básico

```vue
<PageListRoot v-slot="{ pages, currentPageId, switchPage }">
  <ul>
    <li v-for="page in pages" :key="page.id">
      <button
        :data-active="page.id === currentPageId"
        @click="switchPage(page.id)"
      >
        {{ page.name }}
      </button>
    </li>
  </ul>
</PageListRoot>
```

## Véase también

- [usePageList](../composables/use-page-list)
- [Paneles de navegación](../../guides/navigation-panels)
