import type { Canvas } from 'canvaskit-wasm'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { NodeEditOverlayState } from '#core/canvas/node-edit-overlay'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { HANDLE_HALF_SIZE } from '#core/constants'
import { hasTransformHandles } from '#core/geometry/transform-zones'
import { boxCorners, transformBoxPoints, vectorPointsBox } from '#core/vector/point-transform'

/**
 * The corners of the transform box around the selected points of a path being edited, on the
 * canvas: the box a drag is turning or scaling, or else the box around the selected points when
 * two parts are selected and it is large enough on screen to take handles. `null` otherwise.
 */
export function nodeEditTransformBoxCorners(
  editState: NodeEditOverlayState,
  zoom: number
): Vector[] | null {
  if (editState.cutTool || editState.pointsTransformable === false) return null
  if (editState.transformBox) return editState.transformBox
  const points = transformBoxPoints(
    editState,
    editState.selectedVertexIndices,
    editState.selectedSegmentIndices ?? new Set()
  )
  const box = vectorPointsBox(editState.vertices, points)
  if (!box || !hasTransformHandles(box.width * zoom, box.height * zoom)) return null
  return boxCorners(box)
}

/**
 * Draws the transform box around the selected points, as Figma does for two points or more: a thin
 * outline in the selection colour with a square handle at each corner, turned with the box.
 */
export function drawNodeEditTransformBox(
  r: SkiaRenderer,
  canvas: Canvas,
  editState: NodeEditOverlayState
): void {
  const corners = nodeEditTransformBoxCorners(editState, r.zoom)
  if (!corners) return
  const screen = corners.map(({ x, y }) => ({ x: x * r.zoom + r.panX, y: y * r.zoom + r.panY }))

  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setColor(r.selColor())
  r.auxStroke.setPathEffect(null)
  const builder = new r.ck.PathBuilder()
  builder.moveTo(screen[0].x, screen[0].y)
  for (const corner of screen.slice(1)) builder.lineTo(corner.x, corner.y)
  builder.close()
  const outline = builder.detachAndDelete()
  canvas.drawPath(outline, r.auxStroke)
  outline.delete()

  const degrees = (Math.atan2(screen[1].y - screen[0].y, screen[1].x - screen[0].x) * 180) / Math.PI
  const s = HANDLE_HALF_SIZE
  const square = r.ck.LTRBRect(-s, -s, s, s)
  r.auxFill.setColor(r.ck.WHITE)
  for (const corner of screen) {
    canvas.save()
    canvas.translate(corner.x, corner.y)
    canvas.rotate(degrees, 0, 0)
    canvas.drawRect(square, r.auxFill)
    canvas.drawRect(square, r.auxStroke)
    canvas.restore()
  }
}
