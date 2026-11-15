---
title: usePageList
description: Lire les pages et piloter le changement, la création, la suppression et le renommage de pages.
---

# usePageList

`usePageList()` est le composable de gestion des pages derrière les interfaces de liste de pages.

Il fournit :

- `pages`
- `currentPageId`
- `switchPage`
- `addPage`
- `deletePage`
- `renamePage`

## Utilisation

```ts
import { usePageList } from '@pairdraw/vue/primitives/PageList'

const pageList = usePageList()
```

## Exemple simple

```ts
const { pages, currentPageId, switchPage, addPage } = usePageList()
```

## Exemples pratiques

### Changer de page

```ts
switchPage(pageId)
```

### Créer une page

```ts
addPage()
```

## Voir aussi

- [PageListRoot](../components/page-list-root)
- [useMenuModel](./use-menu-model)
