<script setup lang="ts">
import { RadioGroupRoot } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import type { ShaderPreset } from '@pairdraw/scene-graph/shaders'
import {
  SHADER_GALLERY,
  shaderGalleryEntryOf,
  type ShaderGalleryId
} from '@pairdraw/vue/controls/shader'
import { usePanelMessages } from '@pairdraw/vue/i18n'

import ShaderFillPickerGalleryTile from '@/components/fill-picker/shader/ShaderFillPickerGalleryTile.vue'
import theme from '@/theme/shader-gallery'

/**
 * Complete shaders a shader paint takes in one click, as a radio group. Choosing one replaces the
 * paint's preset, which the effects list then edits like any other; the tile of the shader the
 * paint draws, as the gallery has it, is checked, and none is once the preset is edited.
 */
const { preset } = defineProps<{ preset: ShaderPreset }>()
const emit = defineEmits<{ apply: [preset: ShaderPreset] }>()
const panels = usePanelMessages()
const styles = tv(theme)()

const names = computed<Record<ShaderGalleryId, string>>(() => ({
  sunset: panels.value.shaderGallerySunset,
  northernLights: panels.value.shaderGalleryNorthernLights,
  retroScreen: panels.value.shaderGalleryRetroScreen,
  halftonePrint: panels.value.shaderGalleryHalftonePrint,
  ditheredDusk: panels.value.shaderGalleryDitheredDusk,
  glassOrb: panels.value.shaderGalleryGlassOrb,
  marble: panels.value.shaderGalleryMarble,
  neonGrid: panels.value.shaderGalleryNeonGrid,
  velvet: panels.value.shaderGalleryVelvet
}))

const current = computed(() => shaderGalleryEntryOf(preset)?.id)

/**
 * Applies the shader chosen, unless the paint already draws it, as choosing the checked tile
 * again reports. The paint takes its own copy, so editing it never reaches the gallery's.
 */
function apply(value: unknown) {
  const entry = SHADER_GALLERY.find((item) => item.id === value)
  if (!entry || entry.id === current.value) return
  emit('apply', structuredClone(entry.preset))
}
</script>

<template>
  <RadioGroupRoot
    :model-value="current"
    :aria-label="panels.shaderGallery"
    :class="styles.root()"
    loop
    data-test-id="shader-gallery"
    @update:model-value="apply"
  >
    <ShaderFillPickerGalleryTile
      v-for="entry in SHADER_GALLERY"
      :key="entry.id"
      :entry="entry"
      :label="names[entry.id]"
    />
  </RadioGroupRoot>
</template>
