import * as v from 'valibot'

import type { SceneNode, VectorNetwork } from '@pairdraw/scene-graph'
import { cloneVectorNetwork, transformVectorNetwork } from '@pairdraw/scene-graph/vector-network'

import type { FigmaAPI } from '#core/figma-api'
import { defineTool, nodeIdInputSchema, nodeInputSchema, toolNumber } from '#core/tools/schema'
import { parseVectorNetworkJSON } from '#core/tools/vector/network'
import { computeAccurateBounds } from '#core/vector/curve-math'
import { regenerateFillGeometry } from '#core/vector/fill-geometry'

function getVectorNode(
  figma: FigmaAPI,
  id: string
): { node: SceneNode; vn: VectorNetwork } | { error: string } {
  const node = figma.graph.getNode(id)
  if (!node) return { error: `Node "${id}" not found` }
  if (!node.vectorNetwork) return { error: `Node "${id}" has no vector data` }
  return { node, vn: cloneVectorNetwork(node.vectorNetwork) }
}

/**
 * Writes an edited path as the plugin API's vectorNetwork setter does: the layer's box fits the
 * path, the vertices rebase to it, and imported fillGeometry rebuilds from the new path so fills
 * follow the edit instead of drawing the old shape.
 */
function writePath(figma: FigmaAPI, node: SceneNode, network: VectorNetwork): void {
  const bounds = computeAccurateBounds(network)
  const hasGeometry = network.vertices.length > 0
  const rebased = hasGeometry
    ? transformVectorNetwork([1, 0, -bounds.x, 0, 1, -bounds.y, 0, 0, 1], network)
    : network
  figma.graph.updateNode(node.id, {
    x: hasGeometry ? node.x + bounds.x : node.x,
    y: hasGeometry ? node.y + bounds.y : node.y,
    width: hasGeometry ? bounds.width : 0,
    height: hasGeometry ? bounds.height : 0,
    vectorNetwork: rebased,
    fillGeometry: regenerateFillGeometry(rebased, node.fillGeometry, node.cornerRadius),
    strokeGeometry: []
  })
}

export const pathGet = defineTool({
  name: 'path_get',
  description: 'Get vector path data of a node.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: nodeInputSchema,
  execute: (figma, { id }) => {
    const raw = figma.graph.getNode(id)
    if (!raw) return { error: `Node "${id}" not found` }
    const vectorNetwork = raw.vectorNetwork
    return vectorNetwork ? { id, vectorNetwork } : { error: `Node "${id}" has no vector data` }
  }
})

export const pathSet = defineTool({
  name: 'path_set',

  description: 'Set vector path data on a node. Provide a VectorNetwork JSON.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    path: v.pipe(v.string(), v.description('VectorNetwork JSON'))
  }),
  execute: (figma, args) => {
    const raw = figma.graph.getNode(args.id)
    if (!raw) return { error: `Node "${args.id}" not found` }
    const parsed = parseVectorNetworkJSON(args.path)
    if ('error' in parsed) return parsed
    writePath(figma, raw, parsed.network)
    return { id: args.id }
  }
})

export const pathScale = defineTool({
  name: 'path_scale',

  description: 'Scale vector path from center.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    factor: toolNumber(v.pipe(v.number(), v.description('Scale factor (e.g. 2 for double)')))
  }),
  execute: (figma, { id, factor }) => {
    const result = getVectorNode(figma, id)
    if ('error' in result) return result
    const { node: raw, vn } = result
    const centerX = raw.width / 2
    const centerY = raw.height / 2
    for (const vertex of vn.vertices) {
      vertex.x = centerX + (vertex.x - centerX) * factor
      vertex.y = centerY + (vertex.y - centerY) * factor
    }
    for (const segment of vn.segments) {
      segment.tangentStart.x *= factor
      segment.tangentStart.y *= factor
      segment.tangentEnd.x *= factor
      segment.tangentEnd.y *= factor
    }

    writePath(figma, raw, vn)
    return { id, factor }
  }
})

export const pathFlip = defineTool({
  name: 'path_flip',

  description: 'Flip vector path horizontally or vertically.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    axis: v.pipe(v.picklist(['horizontal', 'vertical']), v.description('Flip axis'))
  }),
  execute: (figma, { id, axis }) => {
    const result = getVectorNode(figma, id)
    if ('error' in result) return result
    const { node: raw, vn } = result
    const width = raw.width
    const height = raw.height
    for (const vertex of vn.vertices) {
      if (axis === 'horizontal') vertex.x = width - vertex.x
      else vertex.y = height - vertex.y
    }
    for (const segment of vn.segments) {
      if (axis === 'horizontal') segment.tangentStart.x = -segment.tangentStart.x
      else segment.tangentStart.y = -segment.tangentStart.y
      if (axis === 'horizontal') segment.tangentEnd.x = -segment.tangentEnd.x
      else segment.tangentEnd.y = -segment.tangentEnd.y
    }

    writePath(figma, raw, vn)
    return { id, axis }
  }
})

export const pathMove = defineTool({
  name: 'path_move',

  description: 'Move all path points by an offset.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: nodeIdInputSchema,
    dx: toolNumber(v.pipe(v.number(), v.description('X offset'))),
    dy: toolNumber(v.pipe(v.number(), v.description('Y offset')))
  }),
  execute: (figma, { id, dx, dy }) => {
    const result = getVectorNode(figma, id)
    if ('error' in result) return result
    const { node: raw, vn } = result
    for (const vertex of vn.vertices) {
      vertex.x += dx
      vertex.y += dy
    }

    writePath(figma, raw, vn)
    return { id, dx, dy }
  }
})
