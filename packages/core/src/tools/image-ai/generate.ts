import * as v from 'valibot'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { imageSize } from '@pairdraw/scene-graph/images'
import type { Size } from '@pairdraw/scene-graph/primitives'

import { storeImage } from '#core/figma-api/images'
import { importSVG } from '#core/tools/create/svg'
import { defineTool, nodeNotFound, toolFailure, toolNumber } from '#core/tools/schema'
import { vectorizableImageFill } from '#core/vector/vectorize'

import {
  canHoldImageFill,
  imageFill,
  layerNameFromPrompt,
  orientationFor,
  placeBesideSiblings,
  swapLayerImage
} from './apply'
import { getImageAIService, IMAGE_AI_ORIENTATIONS, IMAGE_AI_UNAVAILABLE } from './service'

const GENERATED_IMAGE_NAME = 'Generated image'
const GENERATED_SVG_NAME = 'Generated SVG'

const promptInput = (description: string) =>
  v.pipe(v.string(), v.regex(/\S/, 'Describe what to generate'), v.description(description))

const placementInputs = {
  name: v.optional(
    v.pipe(v.string(), v.description('Name of the new layer (default: the prompt’s first words)'))
  ),
  parent_id: v.optional(
    v.pipe(v.string(), v.description('Parent of the new layer (default: the current page)'))
  ),
  x: v.optional(
    toolNumber(v.pipe(v.number(), v.description('X in the parent (default: beside its content)')))
  ),
  y: v.optional(
    toolNumber(v.pipe(v.number(), v.description('Y in the parent (default: beside its content)')))
  )
}

/** Shows `bytes` in `target`, unless another edit removed the layer or changed its image meanwhile. */
function fillLayerWithImage(
  graph: SceneGraph,
  target: SceneNode,
  previousHash: string | undefined,
  bytes: Uint8Array,
  size: Size
) {
  // The service may outlast the layer or its image: another edit can change either meanwhile.
  const current = graph.getNode(target.id)
  if (!current) return { error: `"${target.name}" was deleted before the image arrived` }
  if (previousHash) {
    if (!swapLayerImage(graph, current.id, previousHash, bytes)) {
      return { error: `The image of "${current.name}" changed before the new one arrived` }
    }
  } else {
    graph.updateNode(current.id, {
      fills: [...current.fills, imageFill(storeImage(graph, bytes))]
    })
  }
  return { id: current.id, name: current.name, type: current.type, image: size }
}

interface ImageLayerPlacement {
  prompt: string
  name?: string
  width?: number
  x?: number
  y?: number
}

/** A new rectangle in `parentId` showing `bytes` at the image's aspect ratio. */
function createImageLayer(
  graph: SceneGraph,
  parentId: string,
  args: ImageLayerPlacement,
  bytes: Uint8Array,
  size: Size
) {
  if (!graph.getNode(parentId)) return { error: `Parent "${parentId}" was deleted meanwhile` }
  const width = args.width ?? size.width
  const node = graph.createNode('RECTANGLE', parentId, {
    name: args.name ?? layerNameFromPrompt(args.prompt, GENERATED_IMAGE_NAME),
    x: args.x ?? 0,
    y: args.y ?? 0,
    width,
    height: (width * size.height) / size.width,
    fills: [imageFill(storeImage(graph, bytes))]
  })
  if (args.x === undefined && args.y === undefined) placeBesideSiblings(graph, node.id)
  return { id: node.id, name: node.name, type: node.type, image: size }
}

export const generateImage = defineTool({
  name: 'generate_image',
  description:
    'Generate an image from a text prompt with the image service the user set up in Settings → Image services (BYOK). With id, the image fills that layer: it replaces the image the layer shows, or goes on top of its fills. Without id, it becomes a new rectangle layer at the image’s size (or the given width), beside the parent’s content unless x and y are given. It sends the prompt to that service with the user’s own key, costs them money, and takes a while, so call it only when the user asks for a generated image; prefer stock_photo for ordinary photography.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    prompt: promptInput('What the image shows, its style, and its mood, in English'),
    id: v.optional(v.pipe(v.string(), v.description('Layer to fill with the image'))),
    orientation: v.optional(
      v.pipe(
        v.picklist(IMAGE_AI_ORIENTATIONS),
        v.description('Shape of the image (default: the layer’s, else square)')
      )
    ),
    transparent: v.optional(
      v.pipe(v.boolean(), v.description('Ask for a transparent background, for cut-out subjects'))
    ),
    width: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(1),
          v.description('Width of a new layer; its height follows the image (default: image size)')
        )
      )
    ),
    ...placementInputs
  }),
  execute: async (figma, args) => {
    const graph = figma.graph
    const target = args.id ? graph.getNode(args.id) : undefined
    if (args.id && !target) return nodeNotFound(args.id)
    if (target && !canHoldImageFill(target)) {
      return { error: `"${target.name}" (${target.type}) cannot show an image fill` }
    }
    const parentId = args.parent_id ?? figma.currentPage.id
    if (!target && !graph.getNode(parentId)) return { error: `Parent "${parentId}" not found` }
    const service = getImageAIService(graph)
    if (!service) return { error: IMAGE_AI_UNAVAILABLE }

    const previousHash = target ? vectorizableImageFill(target)?.imageHash : undefined
    let bytes: Uint8Array
    try {
      bytes = await service.generateImage({
        prompt: args.prompt,
        orientation:
          args.orientation ?? (target ? orientationFor(target.width, target.height) : 'square'),
        transparent: args.transparent
      })
    } catch (error) {
      return toolFailure(error)
    }
    const size = imageSize(bytes)
    if (!size || size.width <= 0 || size.height <= 0) {
      return { error: 'The image service returned no image this document can show' }
    }

    if (target) return fillLayerWithImage(graph, target, previousHash, bytes, size)
    return createImageLayer(graph, parentId, args, bytes, size)
  }
})

export const generateSVG = defineTool({
  name: 'generate_svg',
  description:
    'Generate an illustration, icon, or logo mark from a text prompt as SVG with the vectorize service the user set up in Settings → Image services, and import it as editable vector layers, as import_svg does. The new frame goes beside the parent’s content unless x and y are given. It uses the user’s own key and takes a while, so call it only when the user asks for generated vector art; use insert_icon for standard icons.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    prompt: promptInput('What the artwork shows and its style, in English'),
    ...placementInputs
  }),
  execute: async (figma, args) => {
    const graph = figma.graph
    const parentId = args.parent_id ?? figma.currentPage.id
    if (!graph.getNode(parentId)) return { error: `Parent "${parentId}" not found` }
    const service = getImageAIService(graph)
    if (!service) return { error: IMAGE_AI_UNAVAILABLE }

    let svg: string
    try {
      svg = await service.generateSVG({ prompt: args.prompt })
    } catch (error) {
      return toolFailure(error)
    }
    if (!graph.getNode(parentId)) return { error: `Parent "${parentId}" was deleted meanwhile` }
    const result = await importSVG.execute(figma, {
      svg,
      name: args.name ?? layerNameFromPrompt(args.prompt, GENERATED_SVG_NAME),
      parent_id: parentId,
      x: args.x,
      y: args.y
    })
    const id = v.safeParse(v.object({ id: v.string() }), result)
    if (!id.success) return result
    if (args.x === undefined && args.y === undefined) placeBesideSiblings(graph, id.output.id)
    return result
  }
})
