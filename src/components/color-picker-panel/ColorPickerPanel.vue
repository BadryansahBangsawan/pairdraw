<script setup lang="ts">
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
  eyedropper = false
} = defineProps<{
  color: Color
  okhcl?: OkHCLControls | null
  /** Offers sampling the canvas, for pickers that edit a document's colors. */
  eyedropper?: boolean
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
