import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedBoundsInParent } from '@pairdraw/scene-graph/coordinate'
import { copyEffects, copyStrokes } from '@pairdraw/scene-graph/copy'
import { FITTED_CONTAINER_TYPES } from '@pairdraw/scene-graph/node-defaults'
import type { Rect } from '@pairdraw/scene-graph/primitives'

import {
  createVectorFrameChildren,
  resolveVectorFramePlacement,
  type VectorFramePlacement
} from './placement'
import type { SVGVectorizeResult } from './svg/to-vectors'

/** Room kept between the original image and the vectors made from it. */
export const VECTORIZE_RESULT_GAP = 40

function hasRoundedCorners(node: SceneNode): boolean {
  return node.independentCorners
    ? [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius].some(
        (radius) => radius > 0
      )
    : node.cornerRadius > 0
}

/** How the image draws, which the vectors keep: opacity, effects, strokes, and corners. */
function appearanceProps(node: SceneNode) {
  return {
    name: node.name,
    opacity: node.opacity,
    visible: node.visible,
    blendMode: node.blendMode,
    effects: copyEffects(node.effects),
    strokes: copyStrokes(node.strokes),
    strokeStyleId: node.strokeStyleId,
    strokeCap: node.strokeCap,
    strokeJoin: node.strokeJoin,
    strokeMiterLimit: node.strokeMiterLimit,
    dashPattern: [...node.dashPattern],
    cornerRadius: node.cornerRadius,
    topLeftRadius: node.topLeftRadius,
    topRightRadius: node.topRightRadius,
    bottomRightRadius: node.bottomRightRadius,
    bottomLeftRadius: node.bottomLeftRadius,
    independentCorners: node.independentCorners,
    cornerSmoothing: node.cornerSmoothing,
    clipsContent: node.clipsContent || hasRoundedCorners(node)
  }
}

/** How a sibling sits in its parent, which the vectors share when they stay in that parent. */
function siblingProps(node: SceneNode) {
  return {
    rotation: node.rotation,
    flipX: node.flipX,
    flipY: node.flipY,
    horizontalConstraint: node.horizontalConstraint,
    verticalConstraint: node.verticalConstraint,
    layoutPositioning: node.layoutPositioning,
    layoutGrow: node.layoutGrow,
    layoutAlignSelf: node.layoutAlignSelf,
    minWidth: node.minWidth,
    maxWidth: node.maxWidth,
    minHeight: node.minHeight,
    maxHeight: node.maxHeight
  }
}

function overlaps(rect: Rect, other: Rect, gap: number): boolean {
  return (
    rect.x < other.x + other.width + gap &&
    rect.x + rect.width + gap > other.x &&
    rect.y < other.y + other.height + gap &&
    rect.y + rect.height + gap > other.y
  )
}

/** Moves `rect` right, past every obstacle in its row, until it overlaps none of them. */
function clearToTheRight(rect: Rect, obstacles: readonly Rect[], gap: number): Rect {
  let placed = rect
  // Each step passes at least one obstacle, so there are at most as many steps as obstacles.
  for (let step = 0; step <= obstacles.length; step++) {
    const current = placed
    const blocking = obstacles.filter((obstacle) => overlaps(current, obstacle, gap))
    if (blocking.length === 0) return placed
    const right = Math.max(...blocking.map((obstacle) => obstacle.x + obstacle.width))
    placed = { ...placed, x: right + gap }
  }
  return placed
}

function childBoxes(graph: SceneGraph, parentId: string): Rect[] {
  const parent = graph.getNode(parentId)
  if (!parent) return []
  return parent.childIds.flatMap((id) => {
    const child = graph.getNode(id)
    return child ? [getAxisAlignedBoundsInParent([child], parentId, graph)] : []
  })
}

/** Layers whose own content a new free-standing layer would join and change. */
function isComponentContent(node: SceneNode): boolean {
  return node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
}

/**
 * Whether a new layer can sit in `parent` without changing anything already there: a page, or a
 * frame that shows what lies beyond its children, lays none of them out, and belongs to no
 * component or instance. A clipping frame would hide the layer, auto layout would move its
 * siblings, a group or boolean would grow or reshape around it, and a component would hand it to
 * every instance.
 */
function takesFreeLayer(graph: SceneGraph, parent: SceneNode): boolean {
  if (parent.type === 'CANVAS') return true
  if (FITTED_CONTAINER_TYPES.has(parent.type)) return false
  if (parent.layoutMode !== 'NONE' || parent.clipsContent) return false
  return !graph.closest(parent.id, isComponentContent)
}

/** The parent the frame goes in, and the layer in it, `node` or one holding it, that it goes beside. */
interface FrameHost {
  parent: SceneNode
  anchor: SceneNode
}

function findFrameHost(graph: SceneGraph, node: SceneNode): FrameHost | null {
  let anchor = node
  // A page always takes the frame, so the walk ends at the latest there.
  for (let steps = 0; steps < graph.nodes.size; steps++) {
    const parent = anchor.parentId ? graph.getNode(anchor.parentId) : undefined
    if (!parent || !parent.childIds.includes(anchor.id)) return null
    if (takesFreeLayer(graph, parent)) return { parent, anchor }
    anchor = parent
  }
  return null
}

/**
 * Right above `anchor`, unless a mask at or below `anchor` would clip the frame: then right below
 * the lowest such mask, where no mask reaches.
 */
function frameIndex(graph: SceneGraph, parent: SceneNode, anchor: SceneNode): number {
  const anchorIndex = parent.childIds.indexOf(anchor.id)
  const lowestMask = parent.childIds
    .slice(0, anchorIndex + 1)
    .findIndex((id) => graph.getNode(id)?.isMask === true)
  return lowestMask === -1 ? anchorIndex + 1 : lowestMask
}

/** Where the frame goes, and how its paths sit in it. */
interface FrameSpot {
  parentId: string
  index: number
  props: Partial<SceneNode>
  placement: VectorFramePlacement
}

/** Beside the image in its own parent, turned and constrained like it. */
function siblingSpot(graph: SceneGraph, node: SceneNode, parent: SceneNode, content: Rect) {
  const placement = resolveVectorFramePlacement(node, content)
  const box = getAxisAlignedBoundsInParent([node], parent.id, graph)
  const beside = clearToTheRight(
    { ...box, x: box.x + box.width + VECTORIZE_RESULT_GAP },
    childBoxes(graph, parent.id),
    VECTORIZE_RESULT_GAP
  )
  const shift = { x: beside.x - box.x, y: beside.y - box.y }
  return {
    placement,
    props: {
      ...siblingProps(node),
      x: placement.x + shift.x,
      y: placement.y + shift.y,
      width: placement.width,
      height: placement.height
    }
  }
}

/** Upright at the image's size beside `anchor`, the layer in `parent` that holds the image. */
function besideHolderSpot(
  graph: SceneGraph,
  node: SceneNode,
  { parent, anchor }: FrameHost,
  content: Rect
) {
  const placement = resolveVectorFramePlacement(
    { x: 0, y: 0, width: node.width, height: node.height, rotation: 0 },
    content
  )
  const box = getAxisAlignedBoundsInParent([node], parent.id, graph)
  const holder = getAxisAlignedBoundsInParent([anchor], parent.id, graph)
  const beside = clearToTheRight(
    {
      x: holder.x + holder.width + VECTORIZE_RESULT_GAP,
      y: box.y,
      width: node.width,
      height: node.height
    },
    childBoxes(graph, parent.id),
    VECTORIZE_RESULT_GAP
  )
  return {
    placement,
    props: {
      x: beside.x + placement.offsetX,
      y: beside.y + placement.offsetY,
      width: placement.width,
      height: placement.height
    }
  }
}

function frameSpot(graph: SceneGraph, node: SceneNode, content: Rect): FrameSpot | null {
  const host = findFrameHost(graph, node)
  if (!host) return null
  const { placement, props } =
    host.anchor === node
      ? siblingSpot(graph, node, host.parent, content)
      : besideHolderSpot(graph, node, host, content)
  return {
    parentId: host.parent.id,
    index: frameIndex(graph, host.parent, host.anchor),
    placement,
    props
  }
}

/**
 * Adds a frame of `vectorized` paths beside the layer `nodeId`, which stays as it was, and returns
 * the frame's ID, or null when there is nowhere to put it or no path to draw. It records no undo
 * step: the editor action and agent tools record it each in their own way.
 */
export function createVectorFrameBeside(
  graph: SceneGraph,
  nodeId: string,
  vectorized: SVGVectorizeResult
): string | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  const spot = frameSpot(graph, node, vectorized.contentBounds)
  if (!spot) return null

  const frame = graph.createNode('FRAME', spot.parentId, {
    ...appearanceProps(node),
    ...spot.props,
    fills: []
  })
  graph.insertChildAt(frame.id, spot.parentId, spot.index)
  createVectorFrameChildren(graph, frame.id, vectorized, spot.placement)
  if (frame.childIds.length === 0) {
    graph.deleteNode(frame.id)
    return null
  }
  return frame.id
}
