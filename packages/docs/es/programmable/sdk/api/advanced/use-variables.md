---
title: useVariables
description: Leer y modificar colecciones de variables, variables y sus valores.
---

# useVariables

`useVariables()` es el composable de variables de más bajo nivel en el que se basan las funciones de más alto nivel del editor de variables.

Úselo cuando quiera controlar directamente las colecciones, los modos activos, el filtrado y las operaciones de creación, lectura, actualización y eliminación sin adoptar toda la abstracción de tabla y diálogo.

## Uso

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Valores devueltos

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
