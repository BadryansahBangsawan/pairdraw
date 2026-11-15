---
title: usePageList
description: Odczytywanie stron oraz ich przełączanie, tworzenie, usuwanie i przemianowywanie.
---

# usePageList

`usePageList()` to composable zarządzania stronami, na którym opierają się interfejsy listy stron.

Udostępnia:

- `pages`
- `currentPageId`
- `switchPage`
- `addPage`
- `deletePage`
- `renamePage`

## Użycie

```ts
import { usePageList } from '@pairdraw/vue/primitives/PageList'

const pageList = usePageList()
```

## Podstawowy przykład

```ts
const { pages, currentPageId, switchPage, addPage } = usePageList()
```

## Praktyczne przykłady

### Przejście do strony

```ts
switchPage(pageId)
```

### Utworzenie strony

```ts
addPage()
```

## Zobacz też

- [PageListRoot](../components/page-list-root)
- [useMenuModel](./use-menu-model)
