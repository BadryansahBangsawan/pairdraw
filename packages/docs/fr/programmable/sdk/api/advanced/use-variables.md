---
title: useVariables
description: Lire et modifier les collections de variables, les variables et leurs valeurs.
---

# useVariables

`useVariables()` est le composable de bas niveau sur lequel reposent les outils de plus haut niveau de l’éditeur de variables.

Utilisez-le pour contrôler directement les collections, les modes actifs, le filtrage et les opérations de création, modification et suppression, sans l’abstraction complète de table et de dialogue.

## Utilisation

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Valeurs renvoyées

- `collections`
- `activeCollectionId`
- `activeCollection`
- `activeModes`
- `variables`
- `searchTerm`
- `setSearchTerm()`
- `setActiveCollection()`
- `addCollection()`
- `renameCollection()`
- `addVariable()`
- `removeVariable()`
- `renameVariable()`
- `updateVariableValue()`
