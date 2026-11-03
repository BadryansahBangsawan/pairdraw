<script setup lang="ts">
import { useElementVisibility, useObjectUrl, watchDebounced } from '@vueuse/core'
import { shallowRef, useTemplateRef, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'

/** The rendered width of a thumbnail in image pixels: twice the panel's column, for sharpness. */
const THUMBNAIL_RENDER_WIDTH = 480
/** How long the document rests before thumbnails redraw, so editing never waits on them. */
const THUMBNAIL_REDRAW_DELAY_MS = 400

/**
 * A slide drawn small, from the document as it stands. It draws only while on screen, and
 * redraws a moment after the document changes.
 */
const { nodeId, alt } = defineProps<{ nodeId: string; alt: string }>()

const store = useEditorStore()
const root = useTemplateRef<HTMLElement>('root')
const visible = useElementVisibility(root)
const image = shallowRef<Blob | null>(null)
const url = useObjectUrl(image)
let request = 0

async function draw() {
  const current = ++request
  const node = store.graph.getNode(nodeId)
  if (!node || node.width <= 0) {
    image.value = null
    return
  }
  try {
    const data = await store.renderExportImage(
      [nodeId],
      THUMBNAIL_RENDER_WIDTH / node.width,
      'PNG',
      store.state.currentPageId
    )
    if (current === request) image.value = data ? new Blob([data], { type: 'image/png' }) : null
  } catch {
    if (current === request) image.value = null
  }
}

watch(
  () => [nodeId, visible.value] as const,
  ([, shown]) => {
    if (shown) void draw()
  },
  { immediate: true, flush: 'post' }
)
watchDebounced(
  () => store.state.sceneVersion,
  () => {
    if (visible.value) void draw()
  },
  { debounce: THUMBNAIL_REDRAW_DELAY_MS }
)
</script>

<template>
  <div ref="root" class="flex size-full items-center justify-center">
    <img
      v-if="url"
      data-test-id="slides-thumbnail"
      :src="url"
      :alt="alt"
      class="max-h-full max-w-full object-contain"
      draggable="false"
    />
  </div>
</template>
