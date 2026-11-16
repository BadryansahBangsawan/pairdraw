import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'
import type { RotationPreview } from '#core/geometry'
import { nodeScreenBounds } from '#core/geometry/scene'

/** A drawn connection's dash, in screen pixels, and its line weight. */
const CONNECTION_DASH = [6, 4] as const
const CONNECTION_WEIGHT = 1.5

/** One reaction's arrow, from a layer's edge to the edge of the frame it shows. */
export interface PrototypeConnection {
  from: Vector
  to: Vector
}

function center(rect: Rect): Vector {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/**
 * Where the ray from `rect`'s centre toward `toward` leaves the box. Both ends of a connection sit
 * this way, so an arrow starts and ends on the layers' edges and never inside them.
 */
export function edgePoint(rect: Rect, toward: Vector): Vector {
  const origin = center(rect)
  const dx = toward.x - origin.x
  const dy = toward.y - origin.y
  if (dx === 0 && dy === 0) return origin
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  const toX = dx === 0 ? Infinity : halfWidth / Math.abs(dx)
  const toY = dy === 0 ? Infinity : halfHeight / Math.abs(dy)
  const t = Math.min(toX, toY)
  return { x: origin.x + dx * t, y: origin.y + dy * t }
}

/**
 * The connections a layer's reactions draw: one arrow per action that shows another layer, drawn
 * between the two layers' edges. Reactions with no target, a deleted target, or a BACK or CLOSE
 * action draw nothing.
 */
export function prototypeConnections(
  graph: SceneGraph,
  nodes: readonly SceneNode[],
  viewport: { panX: number; panY: number; zoom: number },
  preview?: RotationPreview | null
): PrototypeConnection[] {
  const connections: PrototypeConnection[] = []
  for (const node of nodes) {
    const sourceBox = nodeScreenBounds(graph, node, viewport, preview)
    for (const reaction of node.prototypeReactions) {
      for (const action of reaction.actions) {
        if (action.type !== 'NODE' || !action.nodeId) continue
        const target = graph.getNode(action.nodeId)
        if (!target || target.id === node.id) continue
        const targetBox = nodeScreenBounds(graph, target, viewport, preview)
        connections.push({
          from: edgePoint(sourceBox, center(targetBox)),
          to: edgePoint(targetBox, center(sourceBox))
        })
      }
    }
  }
  return connections
}

/**
 * The connections of the selected layers, as Figma draws them: a dashed line with a solid arrowhead
 * at the frame it leads to.
 */
export function drawPrototypeConnections(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: ReadonlySet<string>,
  preview?: RotationPreview | null
): void {
  if (selectedIds.size === 0) return
  const nodes = [...selectedIds].flatMap((id) => {
    const node = graph.getNode(id)
    return node && node.prototypeReactions.length > 0 ? [node] : []
  })
  if (nodes.length === 0) return
  const connections = prototypeConnections(graph, nodes, r, preview)
  if (connections.length === 0) return

  r.auxStroke.setPathEffect(r.ck.PathEffect.MakeDash([...CONNECTION_DASH], 0))
  r.auxStroke.setStrokeWidth(CONNECTION_WEIGHT)
  r.auxStroke.setStrokeCap(r.ck.StrokeCap.Round)
  r.auxStroke.setColor(r.selColor())
  for (const { from, to } of connections) canvas.drawLine(from.x, from.y, to.x, to.y, r.auxStroke)
  r.auxStroke.setPathEffect(null)

  r.auxFill.setMaskFilter(null)
  r.auxFill.setColor(r.selColor())
  for (const { from, to } of connections) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const head = new r.ck.PathBuilder()
    const tip = { x: to.x, y: to.y }
    const reach = 9 * CONNECTION_WEIGHT
    head.moveTo(tip.x, tip.y)
    head.lineTo(
      tip.x - reach * Math.cos(angle - Math.PI / 7),
      tip.y - reach * Math.sin(angle - Math.PI / 7)
    )
    head.lineTo(
      tip.x - reach * Math.cos(angle + Math.PI / 7),
      tip.y - reach * Math.sin(angle + Math.PI / 7)
    )
    head.close()
    const path = head.detachAndDelete()
    canvas.drawPath(path, r.auxFill)
    path.delete()
  }
}
