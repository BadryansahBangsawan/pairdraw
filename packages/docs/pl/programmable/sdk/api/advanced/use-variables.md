---
title: useVariables
description: Odczytywanie i zmiana kolekcji zmiennych, zmiennych i ich wartości.
---

# useVariables

`useVariables()` to niskopoziomowy composable zmiennych, na którym opierają się funkcje pomocnicze edytora zmiennych wyższego poziomu.

Użyj go, gdy potrzebujesz bezpośredniej kontroli nad kolekcjami, aktywnymi trybami, filtrowaniem i operacjami tworzenia, odczytu, aktualizacji i usuwania bez pełnej abstrakcji tabeli i okna dialogowego.

## Użycie

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Zwracane wartości

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
