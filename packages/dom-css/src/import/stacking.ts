import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import type { DesignStyleDeclaration } from '../types'
import { pickStyle } from './css-values'

/** A child the parent paints out of tree order, by its `z-index`. */
interface StackedChild {
  id: string
  z: number
}

/** A child as the builder made it, with the style that decides where CSS paints it. */
export interface PaintedChild {
  layer: SceneNode
  style: DesignStyleDeclaration
}

function isPositioned(style: DesignStyleDeclaration): boolean {
  const position = pickStyle(style, 'position')?.trim()
  return position !== undefined && position !== 'static'
}

function zIndexOf(style: DesignStyleDeclaration): number | null {
  if (!isPositioned(style)) return null
  const value = pickStyle(style, 'z-index')?.trim()
  if (!value || value === 'auto') return null
  const z = Number.parseInt(value, 10)
  return Number.isInteger(z) ? z : null
}

/** Whether a box starts a stacking context of its own, as CSS decides it for the common cases. */
function formsStackingContext(style: DesignStyleDeclaration): boolean {
  const value = (property: string) => pickStyle(style, property)?.trim()
  const position = value('position')
  const opacity = Number.parseFloat(value('opacity') ?? '1')
  return (
    zIndexOf(style) !== null ||
    position === 'fixed' ||
    position === 'sticky' ||
    opacity < 1 ||
    (value('transform') ?? 'none') !== 'none' ||
    (value('filter') ?? 'none') !== 'none' ||
    value('isolation') === 'isolate' ||
    (value('mix-blend-mode') ?? 'normal') !== 'normal'
  )
}

/**
 * Puts a container's children in the order CSS paints them: negative layers first, lowest
 * first, then the boxes in the flow as they were, then positioned ones, lowest first and in tree
 * order at the same level. A container that is not a stacking context paints its negative layers
 * under its own background, which a layer's fills cannot go under, so its fills move to a layer
 * of their own above those children.
 */
export function applyStacking(
  graph: SceneGraph,
  parent: SceneNode,
  style: DesignStyleDeclaration,
  parts: readonly PaintedChild[]
): void {
  if (parts.length === 0) return
  const children: StackedChild[] = []
  let flowAfter = false
  for (const { layer, style: childStyle } of parts) {
    const movable = layer.layoutPositioning === 'ABSOLUTE' || parent.layoutMode === 'NONE'
    if (!isPositioned(childStyle) || !movable) {
      // A positioned box before a box in the flow is painted out of tree order.
      if (children.some((child) => child.z === 0)) flowAfter = true
      continue
    }
    children.push({ id: layer.id, z: zIndexOf(childStyle) ?? 0 })
  }
  if (!flowAfter && children.every((child) => child.z === 0)) return

  const below = children.filter((child) => child.z < 0).toSorted((a, b) => a.z - b.z)
  // Sorted stably, so positioned boxes at the same level keep their tree order.
  const above = children.filter((child) => child.z >= 0).toSorted((a, b) => a.z - b.z)
  const moved = new Set(children.map((child) => child.id))
  const order = [
    ...below.map((child) => child.id),
    ...parent.childIds.filter((id) => !moved.has(id)),
    ...above.map((child) => child.id)
  ]
  for (const [index, id] of order.entries()) graph.insertChildAt(id, parent.id, index)

  if (below.length > 0 && !formsStackingContext(style)) liftBackground(graph, parent, below.length)
}

/** Moves a container's fills into a layer of its own at `index`, its size and corners. */
function liftBackground(graph: SceneGraph, parent: SceneNode, index: number): void {
  if (!parent.fills.some((fill) => fill.visible)) return
  const background = graph.createNode('RECTANGLE', parent.id, {
    name: 'background',
    x: 0,
    y: 0,
    width: parent.width,
    height: parent.height,
    fills: parent.fills,
    cornerRadius: parent.cornerRadius,
    topLeftRadius: parent.topLeftRadius,
    topRightRadius: parent.topRightRadius,
    bottomRightRadius: parent.bottomRightRadius,
    bottomLeftRadius: parent.bottomLeftRadius,
    independentCorners: parent.independentCorners,
    layoutPositioning: parent.layoutMode === 'NONE' ? 'AUTO' : 'ABSOLUTE'
  })
  graph.insertChildAt(background.id, parent.id, index)
  graph.updateNode(parent.id, { fills: [] })
}
