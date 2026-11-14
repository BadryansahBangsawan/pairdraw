<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, ref, useTemplateRef } from 'vue'

import { canDrawShaders } from '@open-pencil/vue/canvas/surface'
import {
  shaderGalleryPreview,
  shaderPresetColors,
  type ShaderGalleryEntry
} from '@open-pencil/vue/controls/shader'

import theme from '@/theme/goodies'

/**
 * One gallery shader in Goodies, a button that applies it: a still of it, drawn the first time the
 * tile scrolls into view, over its palette, which is all a browser without WebGPU shows.
 */
const { entry, label } = defineProps<{ entry: ShaderGalleryEntry; label: string }>()
const emit = defineEmits<{ apply: [] }>()

const styles = tv(theme)()
const root = useTemplateRef<HTMLButtonElement>('root')
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
  <button
    ref="root"
    type="button"
    :class="styles.shader()"
    :data-shader-preset="entry.id"
    @click="emit('apply')"
  >
    <span :class="styles.shaderThumb()" :style="{ background: palette }">
      <img v-if="src" :src="src" alt="" :class="styles.shaderImage()" />
    </span>
    <span :class="styles.shaderLabel()">{{ label }}</span>
  </button>
</template>
