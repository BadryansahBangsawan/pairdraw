<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { RadioGroupItem } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { canDrawShaders } from '@pairdraw/vue/canvas/surface'
import {
  shaderGalleryPreview,
  shaderPresetColors,
  type ShaderGalleryEntry
} from '@pairdraw/vue/controls/shader'

import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/shader-gallery'

/**
 * One shader of the gallery, a radio of its group: a still of it, drawn the first time the tile
 * scrolls into view, over its palette, which is all a browser without WebGPU shows; and its name.
 */
const { entry, label } = defineProps<{ entry: ShaderGalleryEntry; label: string }>()

const styles = tv(theme)()
const root = useTemplateRef<ComponentPublicInstance>('root')
const src = ref<string | null>(null)

const palette = computed(() => {
  const colors = shaderPresetColors(entry.preset)
  if (colors.length === 0) return undefined
  return colors.length === 1 ? colors[0] : `linear-gradient(135deg, ${colors.join(', ')})`
})

const { stop } = useIntersectionObserver(root, ([item]) => {
  if (!item?.isIntersecting) return
  stop()
  if (!canDrawShaders()) return
  void shaderGalleryPreview(entry).then((url) => {
    src.value = url
    return url
  })
})
</script>

<template>
  <RadioGroupItem
    ref="root"
    :value="entry.id"
    :aria-label="label"
    :class="styles.tile()"
    :data-shader-preset="entry.id"
  >
    <span :class="styles.thumb()" :style="{ background: palette }">
      <img v-if="src" :src="src" alt="" :class="styles.image()" />
    </span>
    <Tip :label="label" as-child truncated>
      <span :class="styles.label()">{{ label }}</span>
    </Tip>
  </RadioGroupItem>
</template>
