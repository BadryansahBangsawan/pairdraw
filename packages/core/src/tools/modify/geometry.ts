import * as v from 'valibot'

import { MIN_RESCALE } from '@open-pencil/scene-graph/scaling'

import { assertNodeEditable } from '#core/editor/capabilities'
import { rescaleNodes, SCALE_ANCHORS } from '#core/editor/scale'
import {
  toolNumber,
  nodeIdInputSchema,
  defineTool,
  nodeNotFound,
  toolFailure
} from '#core/tools/schema'

export const setRotation = defineTool({
  name: 'set_rotation',

  description: 'Set rotation angle of a node in degrees.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    angle: toolNumber(v.pipe(v.number(), v.description('Rotation angle in degrees')))
  }),
  execute: (figma, { id, angle }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }
    node.rotation = angle
    return { id, rotation: angle }
  }
})

export const setOpacity = defineTool({
  name: 'set_opacity',

  description: 'Set opacity of a node (0-1).',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    value: toolNumber(
      v.pipe(v.number(), v.minValue(0), v.maxValue(1), v.description('Opacity (0-1)'))
    )
  }),
  execute: (figma, { id, value }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }
    node.opacity = value
    return { id, opacity: value }
  }
})

export const setRadius = defineTool({
  name: 'set_radius',

  description: 'Set corner radius. Use individual corners for independent values.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    radius: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Corner radius for all corners')))
    ),
    top_left: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Top-left radius')))
    ),
    top_right: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Top-right radius')))
    ),
    bottom_right: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Bottom-right radius')))
    ),
    bottom_left: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Bottom-left radius')))
    )
  }),
  execute: (figma, args) => {
    const node = figma.getNodeById(args.id)
    if (!node) return nodeNotFound(args.id)
    if (args.radius !== undefined) {
      node.cornerRadius = args.radius
    }
    if (args.top_left !== undefined) node.topLeftRadius = args.top_left
    if (args.top_right !== undefined) node.topRightRadius = args.top_right
    if (args.bottom_right !== undefined) node.bottomRightRadius = args.bottom_right
    if (args.bottom_left !== undefined) node.bottomLeftRadius = args.bottom_left
    const cr = node.cornerRadius
    if (typeof cr === 'number') {
      return { id: args.id, cornerRadius: cr }
    }
    return {
      id: args.id,
      topLeftRadius: node.topLeftRadius,
      topRightRadius: node.topRightRadius,
      bottomRightRadius: node.bottomRightRadius,
      bottomLeftRadius: node.bottomLeftRadius
    }
  }
})

export const setMinMax = defineTool({
  name: 'set_minmax',

  description: 'Set min/max width and height constraints on a node.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    min_width: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Minimum width')))
    ),
    max_width: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Maximum width')))
    ),
    min_height: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Minimum height')))
    ),
    max_height: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Maximum height')))
    )
  }),
  execute: (figma, args) => {
    const node = figma.getNodeById(args.id)
    if (!node) return nodeNotFound(args.id)
    if (args.min_width !== undefined) node.minWidth = args.min_width
    if (args.max_width !== undefined) node.maxWidth = args.max_width
    if (args.min_height !== undefined) node.minHeight = args.min_height
    if (args.max_height !== undefined) node.maxHeight = args.max_height
    return {
      id: args.id,
      minWidth: node.minWidth,
      maxWidth: node.maxWidth,
      minHeight: node.minHeight,
      maxHeight: node.maxHeight
    }
  }
})

export const rescale = defineTool({
  name: 'rescale',

  description:
    'Scale layers as Figma’s Scale tool (K) does: their size together with text sizes, stroke weights, corner radii, effects, padding, and gaps, and their children with them, unlike node_resize, which changes only the box. Several layers scale together around one anchor of their joint bounds. Locked layers, layers inside instances, and connectors, sections, and sticky shapes are left as they are and listed in skipped.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    ids: v.pipe(v.array(nodeIdInputSchema), v.minLength(1), v.description('Layers to scale')),
    factor: toolNumber(
      v.pipe(
        v.number(),
        v.minValue(MIN_RESCALE),
        v.description('Scale factor: 2 doubles, 0.5 halves')
      )
    ),
    anchor: v.optional(
      v.pipe(
        v.picklist(SCALE_ANCHORS),
        v.description('Point of the layers’ joint bounds that stays put (default: top-left)')
      ),
      'top-left'
    )
  }),
  execute: (figma, { ids, factor, anchor }) => {
    const missing = ids.find((id) => !figma.graph.getNode(id))
    if (missing) return nodeNotFound(missing)
    // Locked layers stay as they are, as the editor's Scale tool leaves them (`unlocked()` in
    // editor/scale/actions.ts).
    const unlocked = ids.filter((id) => figma.graph.getNode(id)?.locked === false)
    let scaled: string[]
    try {
      for (const id of unlocked) assertNodeEditable(figma.graph, id)
      scaled = rescaleNodes(figma.graph, unlocked, factor, anchor)
    } catch (error) {
      return toolFailure(error)
    }
    if (scaled.length === 0) {
      return {
        error:
          'None of these layers can be scaled: they are locked, inside instances, or of a kind the Scale tool leaves alone'
      }
    }
    // A layer below a scaled one scaled with it; the rest were left as they are.
    const roots = new Set(scaled)
    const scaledWithRoot = (id: string) => {
      for (let at = figma.graph.getNode(id)?.parentId; at; at = figma.graph.getNode(at)?.parentId) {
        if (roots.has(at)) return true
      }
      return false
    }
    const skipped = ids.filter((id) => !roots.has(id) && !scaledWithRoot(id))
    return { scaled, factor, anchor, ...(skipped.length > 0 ? { skipped } : {}) }
  }
})
