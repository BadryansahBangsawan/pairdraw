<script setup lang="ts">
/**
 * The eyedropper's loupe, standing in for the cursor: centred on the pointer, so the outlined
 * pixel is the one a click picks. The canvas hides the system cursor while it shows; next to a
 * cursor the system draws ahead of the page, any overlay looks a few frames behind.
 */
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef, watchEffect } from 'vue'

import { colorToHexRaw, colorToPreviewCSS, convertColor } from '@pairdraw/scene-graph/color'
import type { EyedropperLoupe } from '@pairdraw/vue/canvas/eyedropper'

import { useEditorStore } from '@/app/editor/active-store'
import { remToPx } from '@/app/shell/root-font-size'
import theme from '@/theme/canvas/eyedropper-loupe'

const loupeTheme = tv(theme)
// The loupe samples a document's canvas, so its swatch shows the color in that document's profile.
const store = useEditorStore()
const swatch = computed(() => {
  const color = loupe.color.value
  return color ? colorToPreviewCSS(color, store.graph.documentColorSpace) : undefined
})
// A hex code names an sRGB color, so the value reads the color the swatch and canvas draw.
const hex = computed(() => {
  const color = loupe.color.value
  return color ? colorToHexRaw(convertColor(color, store.graph.documentColorSpace, 'srgb')) : ''
})

/** From the card's corner to the centre pixel's centre: 0.375rem padding and 4.5 pixels of 0.5rem. */
const LOUPE_CENTRE_OFFSET_REM = 0.375 + 4.5 * 0.5

const { loupe } = defineProps<{ loupe: EyedropperLoupe }>()

const styles = loupeTheme()
const pixelsCanvas = useTemplateRef<HTMLCanvasElement>('pixels')

const transform = computed(() => {
  const offset = remToPx(LOUPE_CENTRE_OFFSET_REM)
  return `translate(${loupe.clientX.value - offset}px, ${loupe.clientY.value - offset}px)`
})

watchEffect(() => {
  const target = pixelsCanvas.value
  const pixels = loupe.pixels.value
  if (!target || !pixels) return
  target.width = pixels.size
  target.height = pixels.size
  const image = new ImageData(new Uint8ClampedArray(pixels.data), pixels.size, pixels.size)
  target.getContext('2d')?.putImageData(image, 0, 0)
})
</script>

<template>
  <Teleport v-if="loupe.visible.value && loupe.color.value" to="body">
    <div :class="styles.content()" :style="{ transform }" data-test-id="eyedropper-loupe">
      <div :class="styles.loupe()">
        <canvas ref="pixels" :class="styles.pixels()" />
        <span :class="styles.grid()" />
        <span :class="styles.centre()" />
      </div>
      <div :class="styles.value()">
        <span :class="styles.swatch()" :style="{ background: swatch }" />
        <span data-test-id="eyedropper-loupe-value">{{ hex }}</span>
      </div>
    </div>
  </Teleport>
</template>
