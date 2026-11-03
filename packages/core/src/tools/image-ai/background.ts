import * as v from 'valibot'

import type { FigmaAPI } from '#core/figma-api'
import { defineTool, nodeIdInputSchema, nodeNotFound, toolFailure } from '#core/tools/schema'
import { vectorizableImageFill } from '#core/vector/vectorize'

import { swapLayerImage } from './apply'
import { getImageAIService, IMAGE_AI_UNAVAILABLE, type ImageAIImage } from './service'

/**
 * Runs one background edit on the image a layer shows, its topmost visible one, and shows the
 * result in its place, keeping how the fill frames it.
 */
async function editLayerImage(
  figma: FigmaAPI,
  id: string,
  edit: (image: ImageAIImage) => Promise<Uint8Array>
): Promise<Record<string, unknown>> {
  const graph = figma.graph
  const node = graph.getNode(id)
  if (!node) return nodeNotFound(id)
  const fill = vectorizableImageFill(node)
  if (!fill) return { error: `"${node.name}" shows no image` }
  const bytes = graph.images.get(fill.imageHash)
  if (!bytes) return { error: `The image data of "${node.name}" is missing` }

  let result: Uint8Array
  try {
    result = await edit({ imageHash: fill.imageHash, bytes })
  } catch (error) {
    return toolFailure(error)
  }
  // The service may outlast the layer or its image: another edit can change either meanwhile.
  if (!swapLayerImage(graph, id, fill.imageHash, result)) {
    return { error: `The image of "${node.name}" changed before the edit finished` }
  }
  return { id, name: node.name, type: node.type }
}

export const removeBackground = defineTool({
  name: 'remove_background',
  description:
    'Remove the background of the image a layer shows (its topmost visible image fill), leaving the subject on transparency, with the background service the user set up in Settings → Image services (BYOK). The layer keeps its size and how the image is framed. It sends the image to that service with the user’s own key, so call it only when the user asks.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    id: v.pipe(nodeIdInputSchema, v.description('Layer whose image to cut out'))
  }),
  execute: async (figma, { id }) => {
    const service = getImageAIService(figma.graph)
    if (!service) return { error: IMAGE_AI_UNAVAILABLE }
    return editLayerImage(figma, id, (image) => service.removeBackground(image))
  }
})

export const replaceBackground = defineTool({
  name: 'replace_background',
  description:
    'Replace the background of the image a layer shows (its topmost visible image fill) with one described by a prompt, keeping the subject, with the image service the user set up in Settings → Image services (BYOK). The layer keeps its size and how the image is framed. It sends the image to that service with the user’s own key, so call it only when the user asks.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    id: v.pipe(nodeIdInputSchema, v.description('Layer whose image background to replace')),
    prompt: v.pipe(
      v.string(),
      v.regex(/\S/, 'Describe the new background'),
      v.description('The new background, in English (e.g. "a sunlit marble kitchen counter")')
    )
  }),
  execute: async (figma, { id, prompt }) => {
    const service = getImageAIService(figma.graph)
    if (!service) return { error: IMAGE_AI_UNAVAILABLE }
    return editLayerImage(figma, id, (image) => service.replaceBackground({ ...image, prompt }))
  }
})
