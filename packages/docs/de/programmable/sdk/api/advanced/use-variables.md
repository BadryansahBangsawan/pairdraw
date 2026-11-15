---
title: useVariables
description: Variablensammlungen, Variablen und Variablenwerte lesen und ändern.
---

# useVariables

`useVariables()` ist das Variablen-Composable auf niedriger Ebene hinter den übergeordneten Hilfsmitteln des Variableneditors.

Verwenden Sie das Composable für die direkte Kontrolle über Sammlungen, aktive Modi, Filter und CRUD-Vorgänge, ohne die vollständige Tabellen- und Dialogabstraktion zu übernehmen.

## Verwendung

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Rückgabewerte

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
