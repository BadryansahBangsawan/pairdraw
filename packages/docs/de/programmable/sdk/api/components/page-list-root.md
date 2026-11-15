---
title: PageListRoot
description: Strukturelle Komponente ohne vorgegebenes Erscheinungsbild für Seitenlisten.
---

# PageListRoot

`PageListRoot` ist eine strukturelle Komponente ohne vorgegebenes Erscheinungsbild für Seitenlisten.

Sie stellt über ihren Slot bereit:

- die Seiten
- die ID der aktuellen Seite
- die Erkennung von Trennern
- Seitenaktionen wie Hinzufügen, Wechseln, Umbenennen und Löschen

## Verwendung

Verwenden Sie die Komponente, wenn die Struktur der Seitenliste vom SDK kommen soll, Darstellung und Gestaltung aber von der Anwendung.

## Einfaches Beispiel

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

## Siehe auch

- [usePageList](../composables/use-page-list)
