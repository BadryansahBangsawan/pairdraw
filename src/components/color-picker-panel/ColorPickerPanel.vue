<script setup lang="ts">
import type { Color } from '@pairdraw/scene-graph/primitives'
import type { OkHCLControls } from '@pairdraw/vue/controls/color-model'

import ColorAreaControl from '@/components/color-picker-panel/ColorAreaControl.vue'
import DocumentColorsSection from '@/components/color-picker-panel/DocumentColorsSection.vue'
import { provideColorPickerPanel } from '@/components/color-picker-panel/context'
import FormatControls from '@/components/color-picker-panel/FormatControls.vue'
import HueAlphaSliders from '@/components/color-picker-panel/HueAlphaSliders.vue'

const { color, okhcl = null } = defineProps<{
  color: Color
  okhcl?: OkHCLControls | null
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
