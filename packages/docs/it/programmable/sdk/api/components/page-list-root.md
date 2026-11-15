---
title: PageListRoot
description: Componente strutturale senza stile per le interfacce con l'elenco delle pagine.
---

# PageListRoot

`PageListRoot` è un componente strutturale senza stile per le interfacce con l'elenco delle pagine.

Fornisce props dello slot per:

- le pagine
- l'id della pagina corrente
- il riconoscimento dei divisori
- le azioni sulle pagine, come aggiungere, cambiare, rinominare ed eliminare

## Uso

Usalo quando vuoi la struttura dell'elenco delle pagine fornita dall'SDK, con rendering e stili specifici dell'applicazione.

## Esempio di base

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

## Vedi anche

- [usePageList](../composables/use-page-list)
