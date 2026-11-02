import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { parseColor } from '@open-pencil/scene-graph/color'
import { gradientTransformRows, linearGradientTransform } from '@open-pencil/scene-graph/gradient'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { storeImage } from '#core/figma-api/images'
import { defineTool, nodeIdInputSchema, toolFailure, toolNumber } from '#core/tools/schema'

export const setFill = defineTool({
  name: 'set_fill',

  description:
    'Set fill on a node. Solid: color="#ff0000". Linear gradient: gradient="top-bottom" or "left-right" with color (start) and color_end (end).',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    color: v.pipe(v.string(), v.description('Color (hex). For gradient: start color.')),
    color_end: v.optional(
      v.pipe(v.string(), v.description('End color for gradient (if omitted, solid fill)'))
    ),
    gradient: v.optional(
      v.pipe(
        v.picklist(['top-bottom', 'bottom-top', 'left-right', 'right-left']),
        v.description('Gradient direction')
      )
    )
  }),
  execute: (figma, { id, color, color_end, gradient }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }

    const c = parseColor(color)

    if (gradient && color_end) {
      const cEnd = parseColor(color_end)
      // Edge middles of the layer's unit square that each direction runs between.
      const ends: Record<string, [Vector, Vector]> = {
        'top-bottom': [
          { x: 0.5, y: 0 },
          { x: 0.5, y: 1 }
        ],
        'bottom-top': [
          { x: 0.5, y: 1 },
          { x: 0.5, y: 0 }
        ],
        'left-right': [
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 }
        ],
        'right-left': [
          { x: 1, y: 0.5 },
          { x: 0, y: 0.5 }
        ]
      }
      const [start, end] = ends[gradient] ?? ends['top-bottom']
      node.fills = [
        {
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: c },
            { position: 1, color: cEnd }
          ],
          gradientTransform: gradientTransformRows(linearGradientTransform(start, end))
        }
      ]
      return { id, gradient, start: c, end: cEnd }
    }

    // A colour's alpha becomes the paint's opacity, as Figma takes it.
    node.fills = [{ type: 'SOLID', color: c }]
    return { id, color: c }
  }
})

export const setStroke = defineTool({
  name: 'set_stroke',

  description: 'Set the stroke (border) of a node.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    color: v.pipe(v.string(), v.description('Stroke color (hex)')),
    weight: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0.1), v.description('Stroke weight'))),
      1
    ),
    align: v.optional(
      v.pipe(v.picklist(['INSIDE', 'CENTER', 'OUTSIDE']), v.description('Stroke alignment')),
      'INSIDE'
    )
  }),
  execute: (figma, { id, color, weight, align }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }

    const c = parseColor(color)
    node.strokes = [{ type: 'SOLID', color: c }]
    node.strokeWeight = weight
    node.strokeAlign = align
    return { id, color: c, weight: weight }
  }
})

export const setImageFill = defineTool({
  name: 'set_image_fill',

  description:
    'Set an image fill on a node from base64-encoded image data or an image URL (http, https, or data). A URL is fetched as figma.createImageAsync fetches it, up to 64 MB.',
  execution: { kind: 'async', mutation: 'document' },
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    id: nodeIdInputSchema,
    image_data: v.optional(
      v.pipe(v.string(), v.description('Base64-encoded image bytes (PNG, JPEG, or WEBP)'))
    ),
    url: v.optional(
      v.pipe(
        v.string(),
        v.nonEmpty(),
        v.description('Image URL to fetch (http, https, or data), instead of image_data')
      )
    ),
    scale_mode: v.optional(
      v.pipe(v.picklist(['FILL', 'FIT', 'CROP', 'TILE']), v.description('Image scale mode')),
      'FILL'
    )
  }),
  execute: async (figma, { id, image_data, url, scale_mode }) => {
    if (!figma.getNodeById(id)) return { error: `Node "${id}" not found` }
    if ((image_data === undefined) === (url === undefined)) {
      return { error: 'Provide either image_data or url' }
    }
    let imageHash: string
    if (url !== undefined) {
      try {
        imageHash = (await figma.createImageAsync(url)).hash
      } catch (error) {
        return toolFailure(error)
      }
    } else {
      if (!image_data || !isValid(image_data)) return { error: 'image_data is not valid Base64' }
      imageHash = storeImage(figma.graph, toUint8Array(image_data))
    }
    // The fetch may outlast the node: another edit can remove it meanwhile.
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }
    node.fills = [{ type: 'IMAGE', imageHash, scaleMode: scale_mode }]
    return { id, imageHash, scaleMode: scale_mode }
  }
})
