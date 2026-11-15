---
title: PageListRoot
description: Composant structurel sans styles pour les listes de pages.
---

# PageListRoot

`PageListRoot` est un composant structurel sans styles pour les interfaces de liste de pages.

Il fournit dans son emplacement :

- les pages ;
- l’identifiant de la page actuelle ;
- la détection des séparateurs ;
- les actions sur les pages, comme l’ajout, le changement, le renommage et la suppression.

## Utilisation

Utilisez-le pour obtenir la structure de liste de pages du SDK avec un rendu et des styles propres à l’application.

## Exemple de base

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

## Voir aussi

- [usePageList](../composables/use-page-list)
