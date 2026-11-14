import { computed, ref, watch } from 'vue'

import { orientationFor } from '@pairdraw/core/tools'

import {
  generateImageFill,
  generateImageLayer,
  generateSVGLayers,
  replaceImageBackground
} from './action'
import { closeImageAIPrompt, imageAIPrompt, type ImageAIPromptRequest } from './dialog'
import { imageServiceName, svgServiceName } from './request'
import type { ImageAIOrientation } from './types'

/** Runs what a prompt asks for; its outcome arrives as a toast once the dialog has closed. */
function runPrompt(
  request: ImageAIPromptRequest,
  prompt: string,
  orientation: ImageAIOrientation,
  transparent: boolean
): Promise<boolean> {
  const { store, nodeId, fillIndex } = request
  switch (request.mode) {
    case 'replace-background':
      return nodeId ? replaceImageBackground(store, nodeId, prompt) : Promise.resolve(false)
    case 'generate-fill':
      return nodeId
        ? generateImageFill(store, nodeId, prompt, { orientation, fillIndex })
        : Promise.resolve(false)
    case 'generate-image':
      return generateImageLayer(store, prompt, { orientation, transparent })
    case 'generate-svg':
      return generateSVGLayers(store, prompt)
    default: {
      const exhaustive: never = request.mode
      return exhaustive
    }
  }
}

/**
 * The prompt dialog's form: the prompt and, for a new image, its shape and background. It starts
 * over each time the dialog opens; an image fill takes the shape of its layer.
 */
export function useImageAIPromptForm() {
  const prompt = ref('')
  const orientation = ref<ImageAIOrientation>('square')
  const transparent = ref(false)

  watch(
    imageAIPrompt,
    (request) => {
      if (!request) return
      prompt.value = ''
      transparent.value = false
      const node = request.nodeId ? request.store.graph.getNode(request.nodeId) : undefined
      orientation.value = node ? orientationFor(node.width, node.height) : 'square'
    },
    { immediate: true }
  )

  const mode = computed(() => imageAIPrompt.value?.mode ?? null)
  const service = computed(() =>
    mode.value === 'generate-svg' ? svgServiceName() : imageServiceName()
  )
  const canSubmit = computed(() => prompt.value.trim().length > 0)

  function submit(): void {
    const request = imageAIPrompt.value
    if (!request || !canSubmit.value) return
    const text = prompt.value.trim()
    closeImageAIPrompt()
    void runPrompt(request, text, orientation.value, transparent.value)
  }

  return { prompt, orientation, transparent, mode, service, canSubmit, submit }
}
