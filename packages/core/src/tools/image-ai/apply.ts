import type { Fill, NodeType, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedBoundsInParent } from '@pairdraw/scene-graph/coordinate'
import { computeBounds } from '@pairdraw/scene-graph/geometry'

import { TRANSPARENT } from '#core/constants'
import { storeImage } from '#core/figma-api/images'
import { DEFAULT_SPACE_GAP, findEmptySpace } from '#core/tools/read/space'

import type { ImageAIOrientation } from './service'

/** Layers a generated image can fill: closed shapes and containers, as the app's menu offers. */
const IMAGE_FILL_TARGET_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  'FRAME',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'INSTANCE'
])

const LAYER_NAME_MAX_LENGTH = 40

export function canHoldImageFill(node: SceneNode): boolean {
  return IMAGE_FILL_TARGET_TYPES.has(node.type)
}

/** The generated shape that best fits a box: square unless clearly wider or taller. */
export function orientationFor(width: number, height: number): ImageAIOrientation {
  if (width <= 0 || height <= 0) return 'square'
  const ratio = width / height
  if (ratio >= 1.25) return 'landscape'
  if (ratio <= 0.8) return 'portrait'
  return 'square'
}

/** A layer name from a prompt: its first words, as the app names generated layers. */
export function layerNameFromPrompt(prompt: string, fallback: string): string {
  const words = prompt.trim().replace(/\s+/g, ' ')
  if (!words) return fallback
  if (words.length <= LAYER_NAME_MAX_LENGTH) return words
  return `${words.slice(0, LAYER_NAME_MAX_LENGTH - 1).trimEnd()}…`
}

/** A new image fill showing `imageHash`, filling the layer as a placed image does. */
export function imageFill(imageHash: string): Fill {
  return {
    type: 'IMAGE',
    imageHash,
    imageScaleMode: 'FILL',
    color: { ...TRANSPARENT },
    opacity: 1,
    visible: true
  }
}

/**
 * Shows `bytes` in place of the image `previousHash` on a layer, keeping how each fill frames it.
 * False when the layer, or that image on it, went while the service worked.
 */
export function swapLayerImage(
  graph: SceneGraph,
  nodeId: string,
  previousHash: string,
  bytes: Uint8Array
): boolean {
  const node = graph.getNode(nodeId)
  if (!node?.fills.some((fill) => fill.type === 'IMAGE' && fill.imageHash === previousHash)) {
    return false
  }
  const imageHash = storeImage(graph, bytes)
  graph.updateNode(nodeId, {
    fills: node.fills.map((fill) =>
      fill.type === 'IMAGE' && fill.imageHash === previousHash ? { ...fill, imageHash } : fill
    )
  })
  return true
}

/**
 * Moves a new layer beside what its parent already holds, so it covers nothing; a parent with
 * auto layout places it itself.
 */
export function placeBesideSiblings(graph: SceneGraph, nodeId: string): void {
  const node = graph.getNode(nodeId)
  const parent = node?.parentId ? graph.getNode(node.parentId) : undefined
  if (!node || !parent) return
  if (parent.type !== 'CANVAS' && parent.layoutMode !== 'NONE') return
  const obstacles = parent.childIds.flatMap((id) => {
    const sibling = id === nodeId ? undefined : graph.getNode(id)
    return sibling ? [getAxisAlignedBoundsInParent([sibling], parent.id, graph)] : []
  })
  if (obstacles.length === 0) return
  const space = findEmptySpace({
    obstacles,
    width: node.width,
    height: node.height,
    anchor: computeBounds(obstacles),
    gap: DEFAULT_SPACE_GAP,
    directions: ['right']
  })
  graph.updateNode(nodeId, { x: Math.ceil(space.x), y: Math.ceil(space.y) })
}
