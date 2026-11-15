---
title: useVariables
description: Чтение и изменение коллекций, переменных, режимов и значений.
---

# useVariables

`useVariables()` — низкоуровневый composable для переменных, на котором построены высокоуровневые вспомогательные функции редактора переменных.

Используйте его для прямого управления коллекциями, активными режимами, фильтрами и операциями создания, чтения, обновления и удаления без готовых таблицы или диалога.

## Использование

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Возвращаемые значения

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
