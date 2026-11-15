---
title: GradientEditorStop
description: Composant accessible pour un point de dégradé sélectionné ou déplaçable.
---

<script setup lang="ts">
import { data } from '#docs-api/components/gradient-editor-stop.data'
</script>

# GradientEditorStop

`GradientEditorStop` affiche un point de dégradé polymorphe, avec des états de sélection et de glissement documentés. Les points interactifs utilisent le rôle `slider` et exposent leur position en pourcentage par ARIA.

Utilisez des points interactifs sur la barre de dégradé. Les touches fléchées déplacent le point de `positionStep` ; avec Maj, le pas est multiplié par 10. Début et Fin le placent à l’une des deux extrémités, tandis que Suppr et Retour arrière émettent `remove` quand le point peut être supprimé. Les touches traitées arrêtent la propagation, pour que les raccourcis de suppression et de déplacement de l’éditeur ne s’exécutent pas. L’ordre de tabulation natif passe d’un point à l’autre.

Définissez `interactive="false"` lorsque vous réutilisez le composant autour d’une ligne composite de point. La ligne expose toujours les actions de l’emplacement ainsi que `data-selected`/`data-dragging`, mais n’entre pas dans l’ordre de tabulation des curseurs.

```vue twoslash
<script setup lang="ts">
import type { GradientStop } from '@pairdraw/scene-graph'
import { GradientEditorStop } from '@pairdraw/vue/primitives/GradientEditor'

const stop: GradientStop = {
  color: { r: 0.4, g: 0.2, b: 0.9, a: 1 },
  position: 0.5
}
</script>

<template>
  <GradientEditorStop
    :stop="stop"
    :index="0"
    active
    label="Middle gradient stop"
    @update-position="(_index, position) => console.log(position)"
  />
</template>
```

## Référence API générée

<SdkComponentAPI :components="data.components" />

## Voir aussi

- [GradientEditorRoot](./gradient-editor-root)
- [GradientEditorBar](./gradient-editor-bar)
- [useColorModel](/programmable/sdk/api/composables/use-color-model)
