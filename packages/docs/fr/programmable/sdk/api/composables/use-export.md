---
title: useExport
description: Gérer les réglages d’exportation, comme l’échelle et le format, de la sélection actuelle.
---

# useExport

`useExport()` est le composable du panneau d’exportation pour les nœuds sélectionnés.

Il gère :

- les lignes de réglages d’exportation ;
- les identifiants des nœuds sélectionnés ;
- le libellé du nom d’exportation ;
- les échelles et formats pris en charge (identifiants `formats` et options avec libellé `formatOptions`).

## Utilisation

```ts
import { useExport } from '@pairdraw/vue/document/export'

const exportState = useExport()
```

## Exemple simple

```ts
const {
  settings,
  nodeName,
  scales,
  formats,
  formatOptions,
  addSetting,
  updateScale,
  updateFormat,
} = useExport()
```

## Exemples pratiques

### Ajouter un autre préréglage d’exportation

```ts
exportState.addSetting()
```

### Passer la première exportation en WEBP 2x

```ts
exportState.updateScale(0, 2)
exportState.updateFormat(0, 'webp')
```

## Voir aussi

- [useSelectionState](./use-selection-state)
- [useEditor](./use-editor)
