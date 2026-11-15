---
title: usePageList
description: Leggere le pagine e gestirne il cambio, la creazione, l'eliminazione e la rinomina.
---

# usePageList

`usePageList()` è il composable di gestione delle pagine alla base delle interfacce con l'elenco delle pagine.

Espone:

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

## Esempio di base

```ts
const { pages, currentPageId, switchPage, addPage } = usePageList()
```

## Esempi pratici

### Cambiare pagina

```ts
switchPage(pageId)
```

### Creare una nuova pagina

```ts
addPage()
```

## Vedi anche

- [PageListRoot](../components/page-list-root)
- [useMenuModel](./use-menu-model)
