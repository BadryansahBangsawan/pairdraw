---
title: usePageList
description: Leer las páginas y controlar el cambio, la creación, la eliminación y el cambio de nombre de páginas.
---

# usePageList

`usePageList()` es el composable de gestión de páginas en el que se basan las interfaces de lista de páginas.

Expone:

- `pages`
- `currentPageId`
- `switchPage`
- `addPage`
- `deletePage`
- `renamePage`

## Uso

```ts
import { usePageList } from '@pairdraw/vue/primitives/PageList'

const pageList = usePageList()
```

## Ejemplo básico

```ts
const { pages, currentPageId, switchPage, addPage } = usePageList()
```

## Ejemplos prácticos

### Cambiar de página

```ts
switchPage(pageId)
```

### Crear una página nueva

```ts
addPage()
```

## Véase también

- [PageListRoot](../components/page-list-root)
- [useMenuModel](./use-menu-model)
- [useInlineRename](../advanced/use-inline-rename)
