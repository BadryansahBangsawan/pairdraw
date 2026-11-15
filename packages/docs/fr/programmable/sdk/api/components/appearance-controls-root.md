---
title: AppearanceControlsRoot
description: Composant sans styles pour l’opacité, la visibilité, le mode de fusion, le rayon des angles et le lissage.
---

<script setup lang="ts">
import { data } from '#docs-api/components/appearance-controls-root.data'
</script>

# AppearanceControlsRoot

`AppearanceControlsRoot` expose sous forme de composant structurel le contrat d’emplacement renvoyé par `useAppearance()`. Utilisez-le pour créer des contrôles d’apparence réutilisables avec votre propre présentation.

Le composant racine prend les décisions de présentation dérivées de la sélection, notamment `showIndependentCorners`. Cet état devient actif quand l’objet sélectionné utilise explicitement des angles indépendants, ou quand un objet importé contient des valeurs d’angle différentes avec un indicateur d’angle uniforme périmé. Affichez l’interface à partir de cet état plutôt que de maintenir en parallèle une référence locale de dépliage.

`cornerSmoothingPercent` expose la valeur normalisée de la scène sous la forme `0…100` ou `MIXED`. Modifiez-la par les actions d’angle avec des valeurs normalisées `0…1`.

Sur plusieurs objets, les bascules d’angles indépendants, les modifications du lissage et les validations par angle sont regroupées en une seule entrée d’annulation, tout en conservant la valeur d’origine de chaque objet.

## Référence API générée

Les tableaux suivants sont extraits du code source Vue et de la JSDoc lors de la génération de la documentation.

<SdkComponentAPI :components="data.components" />

## Voir aussi

- [useAppearance](../composables/use-appearance)
- [Panneaux de propriétés](../../guides/property-panels)
