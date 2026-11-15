---
title: useFillControls
description: Composable du panneau des remplissages avec un remplissage par défaut.
---

# useFillControls

`useFillControls()` est le composable des propriétés de remplissage utilisé par les interfaces d’édition des remplissages.

Il ajoute une valeur de remplissage par défaut réutilisable.

## Utilisation

```ts
import { useFillControls } from '@pairdraw/vue/controls/fill'

const fills = useFillControls()
```

## Ce qu’il fournit

Il expose :

- `defaultFill`

## Exemples pratiques

### Ajouter une nouvelle ligne de remplissage

```ts
propertyList.add(fills.defaultFill)
```

## Voir aussi

- [PropertyListRoot](../components/property-list-root)
