<script setup lang="ts">
import { computed } from 'vue'

import { canHoldImageFill } from '@pairdraw/core/tools'
import { vectorizableImageFill } from '@pairdraw/core/vector'
import type { Fill } from '@pairdraw/scene-graph'
import { useMediaMessages } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { isImageAIRunning, openImageAIPrompt, removeImageBackground } from '@/app/editor/image-ai'
import { singleSelectedNode } from '@/app/editor/image-ai/apply'
import IconButton from '@/components/ui/button/IconButton.vue'

/**
 * The image fill's AI actions for the one layer it is on: remove or replace the background of the
 * image it shows, or generate a new one into this fill. They run with the services set up in
 * Settings.
 */
const { fill, fillIndex } = defineProps<{
  fill: Fill
  /** Where the fill sits in the layer's fills; a generated image goes into this fill. */
  fillIndex: number
}>()

const store = useEditorStore()
const media = useMediaMessages()

const layer = computed(() => {
  // The actions follow the selection and the fills of the layer it holds.
  void store.state.sceneVersion
  const node = singleSelectedNode(store)
  return node && canHoldImageFill(node) ? node : null
})
/** Background edits act on the image the layer shows, so only on its topmost image fill. */
const editsBackground = computed(() => {
  const node = layer.value
  return Boolean(
    node && fill.imageHash && vectorizableImageFill(node)?.imageHash === fill.imageHash
  )
})
const running = computed(() => isImageAIRunning(store))

function removeBackground() {
  const node = layer.value
  if (node) void removeImageBackground(store, node.id)
}
</script>

<template>
  <template v-if="layer">
    <IconButton
      v-if="editsBackground"
      :label="media.removeBackground"
      :disabled="running"
      data-test-id="fill-picker-remove-background"
      @click="removeBackground"
    >
      <icon-lucide-eraser class="size-3.5" />
    </IconButton>
    <IconButton
      v-if="editsBackground"
      :label="media.replaceBackgroundTitle"
      :disabled="running"
      data-test-id="fill-picker-replace-background"
      @click="openImageAIPrompt(store, 'replace-background')"
    >
      <icon-lucide-wand-sparkles class="size-3.5" />
    </IconButton>
    <IconButton
      :label="media.generateImageFillTitle"
      :disabled="running"
      data-test-id="fill-picker-generate-image"
      @click="openImageAIPrompt(store, 'generate-fill', { fillIndex })"
    >
      <icon-lucide-sparkles class="size-3.5" />
    </IconButton>
  </template>
</template>
