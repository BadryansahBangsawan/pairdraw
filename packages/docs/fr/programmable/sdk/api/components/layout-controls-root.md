---
title: LayoutControlsRoot
description: Composant racine sans styles pour les contrôles de disposition automatique et de dimensionnement.
---

<script setup lang="ts">
import { data } from '#docs-api/components/layout-controls-root.data'
</script>

# LayoutControlsRoot

`LayoutControlsRoot` expose sous forme de composant structurel le contrat d’emplacement renvoyé par `useLayout()`. Utilisez-le pour une structure de contrôles de disposition réutilisable, avec un balisage propre à l’application.

Les champs de largeur et de hauteur peuvent rester modifiables quand leur axe utilise Ajuster au contenu ou Remplir. À la première modification numérique réelle, `updateAxisSize()` enregistre le changement de dimensionnement et passe cet axe en Fixe. Composez le champ avec `BindableValue` et un fournisseur capable de regrouper les interactions lorsque le mode de dimensionnement, le détachement de la variable et la valeur numérique doivent être validés ou annulés en une seule étape d’annulation. Le focus et l’ouverture du sélecteur ne changent pas le mode de dimensionnement.

Utilisez `setAxisSizing('width', mode)` ou `setAxisSizing('height', mode)` pour les menus de dimensionnement. Les anciens setters propres à chaque axe ne font pas partie du contrat actuel.

## Référence API générée

Les tableaux suivants sont extraits du code source Vue et de la JSDoc lors de la génération de la documentation.

<SdkComponentAPI :components="data.components" />

## Voir aussi

- [useLayout](../composables/use-layout)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
- [Panneaux de propriétés](../../guides/property-panels)
