---
title: ColorPickerRoot
description: Sélecteur de couleur sans styles dans une fenêtre surgissante, avec des événements pour le cycle d’interaction.
---

<script setup lang="ts">
import { data } from '#docs-api/components/color-picker-root.data'
</script>

# ColorPickerRoot

`ColorPickerRoot` associe un déclencheur en forme de pastille de couleur à une fenêtre surgissante, et laisse l’interface d’édition à ses emplacements. L’emplacement `trigger` reçoit le style actuel de la pastille ; l’emplacement par défaut reçoit la couleur actuelle du graphe de scène.

`openChange` signale les limites complètes d’une interaction avec le sélecteur. `cancel` est émis avant une fermeture par Échap, ce qui permet aux utilisateurs de BindableValue d’annuler ensemble le détachement d’une variable et la mise à jour de la peinture. Ouvrir le sélecteur ou lui donner le focus n’émet aucune mise à jour de couleur.

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { ColorPickerRoot } from '@pairdraw/vue/primitives/ColorPicker'

const color = ref<Color>({ r: 0.2, g: 0.5, b: 0.9, a: 1 })
</script>

<template>
  <ColorPickerRoot
    :color="color"
    @update="color = $event"
    @open-change="open => console.log(open)"
    @cancel="console.log('cancel')"
  >
    <template #trigger="{ style }">
      <button :style="style" aria-label="Edit color" />
    </template>
    <template #default="{ color: currentColor }">
      <output>{{ currentColor.r }}, {{ currentColor.g }}, {{ currentColor.b }}</output>
    </template>
  </ColorPickerRoot>
</template>
```

## Référence API générée

<SdkComponentAPI :components="data.components" />

## Voir aussi

- [ColorInputRoot](./color-input-root)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
- [BindableValue](/programmable/sdk/api/components/bindable-value)
