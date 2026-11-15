---
title: useVariables
description: Leggere e modificare raccolte di variabili, variabili e i loro valori.
---

# useVariables

`useVariables()` è il composable di basso livello per le variabili, alla base delle funzioni di livello più alto dell'editor di variabili.

Usalo quando vuoi controllare direttamente raccolte, modalità attive, filtri e operazioni di creazione, lettura, modifica ed eliminazione, senza adottare l'intera astrazione di tabella e finestra di dialogo.

## Uso

```ts
import { useVariables } from '@pairdraw/vue/variables'

const variables = useVariables()
```

## Valori restituiti

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
