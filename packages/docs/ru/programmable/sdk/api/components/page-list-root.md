---
title: PageListRoot
description: Структурный компонент без встроенного оформления для списка страниц.
---

# PageListRoot

`PageListRoot` — структурный компонент без встроенного оформления для интерфейсов списка страниц.

Он передаёт через слот:

- страницы;
- идентификатор текущей страницы;
- сведения о разделителях;
- действия со страницами: создание, переключение, переименование и удаление.

## Использование

Используйте его, когда структура списка страниц должна приходить из SDK, а отображение и оформление — из приложения.

## Базовый пример

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

## См. также

- [usePageList](../composables/use-page-list)
