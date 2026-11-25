<script setup lang="ts">
import type { ColorProfile } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { OkHCLControls } from '#vue/controls/color-model/types'
import { useColorModel } from '#vue/controls/color-model/use'

const {
  color,
  editable = false,
  okhcl = null,
  colorProfile = 'srgb'
} = defineProps<{
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  /**
   * The profile the color is stored in; the hex text converts it into sRGB, so it reads the
   * color the canvas draws.
   */
  colorProfile?: ColorProfile
}>()

const emit = defineEmits<{ update: [color: Color] }>()
const model = useColorModel({
  color: () => color,
  colorProfile: () => colorProfile,
  onUpdate: (nextColor) => emit('update', nextColor)
})

const actions = {
  updateFromHex: model.updateHex,
  updateColor: model.updateColor
}
</script>

<template>
  <slot
    :color="color"
    :editable="editable"
    :hex="model.hex.value"
    :actions="actions"
    :okhcl="okhcl"
  />
</template>
