<script setup lang="ts">
import type { ColorProfile } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import type { OkHCLControls } from '@pairdraw/vue/controls/color-model'

import ColorAreaControl from '@/components/color-picker-panel/ColorAreaControl.vue'
import { provideColorPickerPanel } from '@/components/color-picker-panel/context'
import DocumentColorsSection from '@/components/color-picker-panel/DocumentColorsSection.vue'
import FormatControls from '@/components/color-picker-panel/FormatControls.vue'
import HueAlphaSliders from '@/components/color-picker-panel/HueAlphaSliders.vue'

const {
  color,
  okhcl = null,
  eyedropper = false,
  colorProfile = 'srgb'
} = defineProps<{
  color: Color
  okhcl?: OkHCLControls | null
  /** Offers sampling the canvas, for pickers that edit a document's colors. */
  eyedropper?: boolean
  /** The profile the color is stored in; a Display P3 document shows its gamut. */
  colorProfile?: ColorProfile
}>()

const emit = defineEmits<{
  update: [color: Color]
}>()

provideColorPickerPanel(
  {
    get color() {
      return color
    },
    get okhcl() {
      return okhcl
    },
    get eyedropper() {
      return eyedropper
    },
    get colorProfile() {
      return colorProfile
    }
  },
  emit
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <DocumentColorsSection />
    <ColorAreaControl />
    <HueAlphaSliders />
    <FormatControls />
  </div>
</template>
