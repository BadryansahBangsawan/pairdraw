<script setup lang="ts">
import { computed } from 'vue'

import type { TextureEffect } from '@pairdraw/scene-graph'
import { UNSET_TEXTURE } from '@pairdraw/scene-graph/constants'
import { type EffectChange, textureChange } from '@pairdraw/vue/controls/effects'
import { useI18n } from '@pairdraw/vue/i18n'

import NumberField from '@/components/inputs/NumberField.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

/** A texture effect's settings as Figma's panel lays them out: grain size, radius, clipping. */
const { effect } = defineProps<{ effect: TextureEffect }>()
const emit = defineEmits<{
  scrub: [changes: EffectChange]
  commit: [changes: EffectChange]
}>()

const { panels } = useI18n()
const texture = computed(() => effect.texture ?? UNSET_TEXTURE)

/** Figma keeps a texture's radius within 0 to 100. */
function radiusChange(radius: number): Partial<TextureEffect> {
  return { radius: Math.max(0, Math.min(100, radius)) }
}
</script>

<template>
  <PanelFieldGroup :label="panels.grainSize">
    <NumberField
      icon="X"
      :inherit-binding="false"
      :aria-label="panels.grainSize"
      :model-value="texture.noiseSize.x"
      :min="0"
      :max="100"
      data-property="texture-size"
      @update:model-value="emit('scrub', textureChange({ noiseSize: { x: $event, y: $event } }))"
      @commit="emit('commit', textureChange({ noiseSize: { x: $event, y: $event } }))"
    />
    <!-- As in Figma, the grain stays square: the vertical size follows the horizontal one. -->
    <NumberField
      icon="Y"
      :inherit-binding="false"
      :aria-label="panels.grainSize"
      :model-value="texture.noiseSize.y"
      disabled
    />
  </PanelFieldGroup>
  <PanelFieldGroup :label="panels.radius">
    <NumberField
      :aria-label="panels.radius"
      :inherit-binding="false"
      :model-value="effect.radius"
      :min="0"
      :max="100"
      data-property="texture-radius"
      @update:model-value="emit('scrub', radiusChange($event))"
      @commit="emit('commit', radiusChange($event))"
    />
  </PanelFieldGroup>
  <label class="flex cursor-pointer items-center gap-2 text-xs text-surface">
    <AppCheckbox
      :model-value="texture.clipToShape"
      :ariaLabel="panels.clipToShape"
      data-property="texture-clip"
      @update:model-value="emit('commit', textureChange({ clipToShape: $event }))"
    />
    {{ panels.clipToShape }}
  </label>
</template>
