import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { Variable, VariableCollection, VariableValue } from '@pairdraw/scene-graph'
import { gradientTransformRows, linearGradientTransform } from '@pairdraw/scene-graph/gradient'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import type { FigmaAPI } from '#core/figma-api'

import { storeImage } from '#core/figma-api/images'
import { PairdrawAPI } from '#core/pairdraw-api'
import {
  defineTool,
  nodeIdInputSchema,
  parseToolColor,
  toolFailure,
  toolNumber
} from '#core/tools/schema'

/**
 * Stretch as Figma's API writes it: a crop whose window is the whole image, which the image fill
 * panel's Stretch and `.pen`'s `stretch` also store.
 */
const STRETCH_IMAGE_TRANSFORM: [[number, number, number], [number, number, number]] = [
  [1, 0, 0],
  [0, 1, 0]
]

/** `var(--color/brand)` or `var(--color/brand, #4F46E5)`: a token by name, as `get_css` writes it. */
const COLOR_TOKEN = /^var\(\s*--([^),\s]+)\s*(?:,[^)]*)?\)$/

function colorVariablesNamed(figma: FigmaAPI, name: string): Variable[] {
  const matches: Variable[] = []
  for (const variable of figma.graph.variables.values()) {
    if (variable.type === 'COLOR' && variable.name === name) matches.push(variable)
  }
  return matches
}

/** A colour, as opposed to a token alias or an expression a variable may hold instead. */
function isColor(value: VariableValue | undefined): value is Color {
  return (
    typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value && 'a' in value
  )
}

/** The colour a token holds in its default mode, and its collection, for a fill to take. */
function tokenColor(
  figma: FigmaAPI,
  variable: Variable
): { color: Color; collection: VariableCollection | undefined } | { error: string } {
  const collection = figma.graph.variableCollections.get(variable.collectionId)
  const value = collection
    ? variable.valuesByMode[collection.defaultModeId]
    : Object.values(variable.valuesByMode)[0]
  if (!isColor(value)) return { error: `Variable "${variable.name}" holds no colour` }
  return { color: value, collection }
}

export const setFill = defineTool({
  name: 'set_fill',

  description:
    'Set fill on a node. Solid: color="#ff0000". A token by name: color="var(--color/brand)" paints its colour and binds the fill. Linear gradient: gradient="top-bottom" or "left-right" with color (start) and color_end (end).',
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

    // A token name paints the colour it holds and binds the fill, so the layer follows the token.
    const token = COLOR_TOKEN.exec(color)
    const name = token === null ? null : token[1]
    if (name !== null) {
      const matches = colorVariablesNamed(figma, name)
      if (matches.length === 0) {
        return {
          error: `No COLOR variable named "${name}". Call find_variables to list the document's tokens.`
        }
      }
      if (matches.length > 1) {
        const where = matches
          .map(
            (variable) =>
              figma.graph.variableCollections.get(variable.collectionId)?.name ?? variable.collectionId
          )
          .join(', ')
        return {
          error: `${matches.length} variables named "${name}" (${where}); bind one with bind_variable.`
        }
      }
      for (const variable of matches) {
        const resolved = tokenColor(figma, variable)
        if ('error' in resolved) return resolved
        node.fills = [{ type: 'SOLID', color: resolved.color }]
        new PairdrawAPI(figma).bindVariable(node.id, 'fills/0/color', variable)
        return { id, color: resolved.color, bound: name }
      }
      return { error: `No COLOR variable named "${name}"` }
    }

    const c = parseToolColor(color, figma.graph.documentColorSpace)
    if ('error' in c) return c

    if (gradient && color_end) {
      const cEnd = parseToolColor(color_end, figma.graph.documentColorSpace)
      if ('error' in cEnd) return cEnd
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

    const c = parseToolColor(color, figma.graph.documentColorSpace)
    if ('error' in c) return c
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
      v.pipe(
        v.picklist(['FILL', 'FIT', 'CROP', 'TILE', 'STRETCH']),
        v.description(
          'Image scale mode. STRETCH stretches the whole image to the layer, ignoring its aspect ratio, as the Stretch mode of the image fill panel does.'
        )
      ),
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
    node.fills = [
      scale_mode === 'STRETCH'
        ? { type: 'IMAGE', imageHash, scaleMode: 'CROP', imageTransform: STRETCH_IMAGE_TRANSFORM }
        : { type: 'IMAGE', imageHash, scaleMode: scale_mode }
    ]
    return { id, imageHash, scaleMode: scale_mode }
  }
})
