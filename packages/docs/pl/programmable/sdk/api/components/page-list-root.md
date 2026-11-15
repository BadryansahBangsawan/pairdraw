---
title: PageListRoot
description: Komponent strukturalny bez narzuconego wyglądu dla interfejsów listy stron.
---

# PageListRoot

`PageListRoot` to komponent strukturalny bez narzuconego wyglądu dla interfejsów listy stron.

Przez sloty udostępnia:

- strony;
- identyfikator bieżącej strony;
- wykrywanie separatorów;
- działania na stronach, takie jak dodawanie, przełączanie, zmiana nazwy i usuwanie.

## Użycie

Użyj go, gdy chcesz korzystać ze struktury listy stron dostarczanej przez SDK, a renderowanie i style zachować po stronie aplikacji.

## Podstawowy przykład

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

## Zobacz też

- [usePageList](../composables/use-page-list)
- [Panele nawigacyjne](../../guides/navigation-panels)
