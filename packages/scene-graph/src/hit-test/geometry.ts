// Where a point lies against a layer's box and a mask's outline, in the layer's own coordinates.
import { getWorldMatrix } from '../coordinate'
import { geometryBlobPolylines } from '../geometry'
import type { SceneGraph } from '../graph'
import Matrix from '../matrix'
import type { Vector } from '../primitives'
import type { SceneNode } from '../types'

/**
 * How far from a zero-width or zero-height layer, in canvas units, a point still lands on it, so
 * a flat line or an empty box stays clickable; matches a connector line's slop (`connectors/hit.ts`).
 */
const DEGENERATE_AXIS_SLOP = 4

function hasTransformedAncestor(
  node: SceneNode,
  graph: SceneGraph,
  cache: Map<string, boolean>
): boolean {
  const cached = cache.get(node.id)
  if (cached !== undefined) return cached
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  const transformed =
    node.rotation !== 0 ||
    node.flipX ||
    node.flipY ||
    (parent ? hasTransformedAncestor(parent, graph, cache) : false)
  cache.set(node.id, transformed)
  return transformed
}

/**
 * Where the point lies in the node's own coordinates: its offset from the position when nothing
 * above it is turned, else through the inverse world matrix. Null when that cannot be inverted.
 */
export function localPoint(
  px: number,
  py: number,
  node: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): Vector | null {
  if (!hasTransformedAncestor(node, graph, transformCache)) {
    const absolute = graph.getAbsolutePosition(node.id)
    return { x: px - absolute.x, y: py - absolute.y }
  }
  const inv = Matrix.invert(getWorldMatrix(node, graph))
  if (!inv) return null
  const [x, y] = Matrix.mapPoints(inv, [px, py])
  return { x, y }
}

/** Whether the point lies in the node's box, grown by `pad` canvas units on every side. */
export function containsPoint(
  px: number,
  py: number,
  node: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>,
  pad = 0
): boolean {
  const local = localPoint(px, py, node, graph, transformCache)
  if (!local) return false
  const padX = node.width > 0 ? pad : Math.max(pad, DEGENERATE_AXIS_SLOP)
  const padY = node.height > 0 ? pad : Math.max(pad, DEGENERATE_AXIS_SLOP)
  return (
    local.x >= -padX &&
    local.x <= node.width + padX &&
    local.y >= -padY &&
    local.y <= node.height + padY
  )
}

/** Whether a rounded rectangle of `width` × `height` holds the point. */
function roundedRectContains(
  point: Vector,
  width: number,
  height: number,
  radius: number
): boolean {
  if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) return false
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const cx = Math.min(Math.max(point.x, r), width - r)
  const cy = Math.min(Math.max(point.y, r), height - r)
  return Math.hypot(point.x - cx, point.y - cy) <= r
}

/** Whether the point is inside a closed polyline, by the even-odd rule. */
function insidePolyline(polyline: readonly Vector[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = polyline.length - 1; i < polyline.length; j = i++) {
    const a = polyline[i]
    const b = polyline[j]
    if (a.y > y === b.y > y) continue
    if (x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/**
 * Whether a mask lets the point through, by the outline it draws: an ellipse's curve, a rounded
 * rectangle's corners, or a vector's filled path. Other shapes clip by their box.
 */
export function maskContainsPoint(
  px: number,
  py: number,
  mask: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): boolean {
  const outlined =
    (mask.type === 'ELLIPSE' && mask.width > 0 && mask.height > 0) ||
    (mask.type === 'RECTANGLE' && mask.cornerRadius > 0) ||
    (mask.type === 'VECTOR' && mask.fillGeometry.length > 0)
  if (!outlined) return containsPoint(px, py, mask, graph, transformCache)
  const local = localPoint(px, py, mask, graph, transformCache)
  if (!local) return false
  if (mask.type === 'ELLIPSE') {
    const rx = mask.width / 2
    const ry = mask.height / 2
    const dx = (local.x - rx) / rx
    const dy = (local.y - ry) / ry
    return dx * dx + dy * dy <= 1
  }
  if (mask.type === 'RECTANGLE') {
    return roundedRectContains(local, mask.width, mask.height, mask.cornerRadius)
  }
  return geometryBlobPolylines(mask.fillGeometry).some((points) =>
    insidePolyline(points, local.x, local.y)
  )
}
