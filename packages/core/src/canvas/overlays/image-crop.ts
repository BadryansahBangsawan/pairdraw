import type { Canvas, Color } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { applyImageFill } from '#core/canvas/fills'
import { inNodeSpace } from '#core/canvas/overlays/outline'
import { polyline } from '#core/canvas/overlays/paths'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { editedImage, editedImageLayout, type EditedImage } from '#core/editor/image-edit'
import type { ImageEdit } from '#core/editor/types'
import {
  IMAGE_CROP_GHOST_ALPHA,
  IMAGE_CROP_HANDLE,
  createSceneGeometry,
  imageCropHandles,
  imageCropQuad,
  type ImageCropQuad,
  type RotationPreview
} from '#core/geometry'

/** The whole image, faded where it lies outside the layer, drawn in the layer's own pixels. */
function drawGhost(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  edited: EditedImage,
  preview?: RotationPreview | null
) {
  const { node } = edited
  const quad = imageCropQuad(edited.transform, node.width, node.height)
  if (!quad) return
  const fill = { ...edited.fill, imageScaleMode: 'CROP' as const, imageTransform: edited.transform }
  const paint = r.auxFill
  inNodeSpace(r, canvas, createSceneGeometry(graph, preview), node, () => {
    paint.setMaskFilter(null)
    paint.setColor(r.ck.Color4f(1, 1, 1, IMAGE_CROP_GHOST_ALPHA))
    // An image that is not decoded yet shows its outline alone until it is.
    if (!applyImageFill(r, fill, node, graph, paint)) return
    const path = polyline(r, quad, true)
    canvas.save()
    try {
      canvas.clipRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.ck.ClipOp.Difference, true)
      canvas.drawPath(path, paint)
    } finally {
      canvas.restore()
      path.delete()
      paint.setShader(null)
      paint.setColor(r.ck.Color4f(1, 1, 1, 1))
    }
  })
}

/** A line `width` screen pixels wide in `color`, along `points`, with square ends. */
function strokeLine(
  r: SkiaRenderer,
  canvas: Canvas,
  points: readonly Vector[],
  width: number,
  color: Color
) {
  const paint = r.auxStroke
  const path = polyline(r, points, false)
  paint.setPathEffect(null)
  paint.setMaskFilter(null)
  paint.setStrokeWidth(width)
  paint.setColor(color)
  paint.setStrokeCap(r.ck.StrokeCap.Square)
  try {
    canvas.drawPath(path, paint)
  } finally {
    paint.setStrokeCap(r.ck.StrokeCap.Butt)
    path.delete()
  }
}

function outline(r: SkiaRenderer, canvas: Canvas, quad: ImageCropQuad, color: Color) {
  const paint = r.auxStroke
  const path = polyline(r, quad, true)
  paint.setPathEffect(null)
  paint.setMaskFilter(null)
  paint.setStrokeWidth(1)
  paint.setColor(color)
  canvas.drawPath(path, paint)
  path.delete()
}

function unit(from: Vector, to: Vector): Vector {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function along(point: Vector, direction: Vector, distance: number): Vector {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

/**
 * The layer's crop handles: a bracket at each corner along its two edges and a bar on the middle
 * of each edge, white inside an outline in the selection colour, as Figma draws them.
 */
function drawCropHandles(r: SkiaRenderer, canvas: Canvas, frame: ImageCropQuad, color: Color) {
  const { cornerLength, edgeLength, thickness } = IMAGE_CROP_HANDLE
  const lines: Vector[][] = []
  for (let index = 0; index < 4; index++) {
    const corner = frame[index]
    const next = frame[(index + 1) % 4]
    const previous = frame[(index + 3) % 4]
    lines.push([
      along(corner, unit(corner, previous), cornerLength),
      corner,
      along(corner, unit(corner, next), cornerLength)
    ])
  }
  for (const { handle, point } of imageCropHandles(frame).slice(4)) {
    const [from, to] =
      handle === 'n' || handle === 's' ? [frame[0], frame[1]] : [frame[1], frame[2]]
    const direction = unit(from, to)
    lines.push([along(point, direction, -edgeLength / 2), along(point, direction, edgeLength / 2)])
  }
  const white = r.ck.Color4f(1, 1, 1, 1)
  for (const line of lines) strokeLine(r, canvas, line, thickness + 2, color)
  for (const line of lines) strokeLine(r, canvas, line, thickness, white)
}

function drawImageHandles(r: SkiaRenderer, canvas: Canvas, image: ImageCropQuad, color: Color) {
  const fill = r.auxFill
  const border = r.auxStroke
  const radius = IMAGE_CROP_HANDLE.imageHandleRadius
  fill.setMaskFilter(null)
  border.setPathEffect(null)
  border.setStrokeWidth(1)
  border.setColor(color)
  for (const point of image) {
    fill.setColor(r.ck.WHITE)
    canvas.drawCircle(point.x, point.y, radius, fill)
    canvas.drawCircle(point.x, point.y, radius, border)
  }
}

/**
 * Image edit mode in place of the selection: the whole image, faded outside the layer and
 * outlined with corner dots that scale it, and the layer's outline with crop handles.
 */
export function drawImageCrop(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  edit: ImageEdit | null | undefined,
  preview?: RotationPreview | null
): void {
  const edited = editedImage(graph, edit)
  const layout = editedImageLayout(graph, edit, r, preview)
  if (!edited || !layout) return
  drawGhost(r, canvas, graph, edited, preview)
  const color = r.selColor()
  outline(r, canvas, layout.image, color)
  outline(r, canvas, layout.frame, color)
  drawImageHandles(r, canvas, layout.image, color)
  if (layout.croppable) drawCropHandles(r, canvas, layout.frame, color)
}
