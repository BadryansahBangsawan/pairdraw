import { Edge, type Node as YogaNode } from 'yoga-layout'

import type { SceneNode, Stroke } from '@pairdraw/scene-graph'

/** Widths on each side of a layer, in Yoga's edge order: top, right, bottom, left. */
type Sides = [number, number, number, number]

const EDGES = [Edge.Top, Edge.Right, Edge.Bottom, Edge.Left] as const

/** The share of a stroke's weight that lies outside the layer it outlines. */
function outsideShare(align: Stroke['align']): number {
  if (align === 'OUTSIDE') return 1
  if (align === 'CENTER') return 0.5
  return 0
}

/**
 * How far a layer's visible strokes reach into (`inside`) or out of (`outside`) its box on each
 * side, the widest stroke deciding. Sides with weights of their own use them for every stroke.
 */
function strokeExtent(node: SceneNode, part: 'inside' | 'outside'): Sides | null {
  const strokes = node.strokes.filter((stroke) => stroke.visible)
  if (strokes.length === 0) return null
  const extent: Sides = [0, 0, 0, 0]
  for (const stroke of strokes) {
    const outside = outsideShare(stroke.align)
    const share = part === 'outside' ? outside : 1 - outside
    const weights = node.independentStrokeWeights
      ? [
          node.borderTopWeight,
          node.borderRightWeight,
          node.borderBottomWeight,
          node.borderLeftWeight
        ]
      : [stroke.weight, stroke.weight, stroke.weight, stroke.weight]
    for (const [side, weight] of weights.entries()) {
      extent[side] = Math.max(extent[side], Math.max(0, weight) * share)
    }
  }
  return extent.some((width) => width > 0) ? extent : null
}

/**
 * Whether a child's strokes take room in its parent's auto layout. Text strokes follow its glyphs
 * rather than its box, and a child out of the flow is placed where it is.
 */
function strokeTakesRoom(child: SceneNode, parent: SceneNode): boolean {
  return (
    parent.strokesIncludedInLayout &&
    child.type !== 'TEXT' &&
    child.visible &&
    child.layoutPositioning !== 'ABSOLUTE'
  )
}

/**
 * With strokes included in its layout, an auto layout frame lays its content out inside the part
 * of its own stroke that falls within its box, as CSS `box-sizing: border-box` does with a border.
 */
function applyStrokeBorders(yogaNode: YogaNode, node: SceneNode): void {
  if (!node.strokesIncludedInLayout) return
  const inside = strokeExtent(node, 'inside')
  if (!inside) return
  for (const [side, edge] of EDGES.entries()) yogaNode.setBorder(edge, inside[side])
}

/** Insets a layout container's content by its padding and, with strokes included, its stroke. */
export function applyContentInsets(yogaNode: YogaNode, node: SceneNode): void {
  yogaNode.setPadding(Edge.Top, node.paddingTop)
  yogaNode.setPadding(Edge.Right, node.paddingRight)
  yogaNode.setPadding(Edge.Bottom, node.paddingBottom)
  yogaNode.setPadding(Edge.Left, node.paddingLeft)
  applyStrokeBorders(yogaNode, node)
}

/**
 * With strokes included in its parent's layout, the part of a child's stroke that falls outside
 * its box takes room beside it, so neighbours and a hugging parent clear the stroke.
 */
export function applyStrokeMargins(yogaChild: YogaNode, child: SceneNode, parent: SceneNode): void {
  if (!strokeTakesRoom(child, parent)) return
  const outside = strokeExtent(child, 'outside')
  if (!outside) return
  for (const [side, edge] of EDGES.entries()) yogaChild.setMargin(edge, outside[side])
}

/**
 * The room strokes take along one axis of a frame laid out with them included: its own stroke
 * inside its box on both ends, and the stroke outside each child's box.
 */
export function strokeRoom(
  parent: SceneNode,
  children: readonly SceneNode[],
  axis: 'width' | 'height'
): number {
  if (!parent.strokesIncludedInLayout) return 0
  const [start, end] = axis === 'width' ? [3, 1] : [0, 2]
  const across = (sides: Sides | null) => (sides ? sides[start] + sides[end] : 0)
  let room = across(strokeExtent(parent, 'inside'))
  for (const child of children) {
    if (strokeTakesRoom(child, parent)) room += across(strokeExtent(child, 'outside'))
  }
  return room
}
