import { clamp } from 'es-toolkit'

import type { GradientTransform } from '@pairdraw/scene-graph'
import { computeBounds } from '@pairdraw/scene-graph/geometry'
import Matrix, { type Mat3 } from '@pairdraw/scene-graph/matrix'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

import type { HandlePosition } from './transform-zones'

/**
 * Cropping and reframing an image fill on the canvas. A crop's transform maps the layer's unit
 * square to the image's (`Fill.imageTransform`), so the layer shows the window it describes:
 * cropping moves the layer's edges over a still image, and reframing moves or scales the image
 * behind a still layer.
 */

/** Four corners in order: top-left, top-right, bottom-right, bottom-left. */
export type ImageCropQuad = readonly [Vector, Vector, Vector, Vector]

export type ImageCropCorner = 0 | 1 | 2 | 3

/** Screen-pixel sizes of the crop handles. */
export const IMAGE_CROP_HANDLE = {
  /** Each arm of a corner bracket. */
  cornerLength: 12,
  /** The bar on the middle of each edge. */
  edgeLength: 16,
  /** Bracket and bar thickness, inside their outline. */
  thickness: 3,
  /** The image's corner dots. */
  imageHandleRadius: 4,
  /** How far from a handle a press still takes it. */
  hitRadius: 8,
  /** How far from an edge a press still takes it. */
  edgeHitDistance: 5
} as const

/** The opacity of the image outside the layer while it is edited. */
export const IMAGE_CROP_GHOST_ALPHA = 0.4

const MIN_CROP_SIZE = 1
const MIN_IMAGE_SCALE = 0.01
const EPSILON = 1e-4

function toMatrix(t: GradientTransform): Mat3 {
  return [t.m00, t.m01, t.m02, t.m10, t.m11, t.m12, 0, 0, 1]
}

function fromMatrix(m: Mat3): GradientTransform {
  return { m00: m[0], m01: m[1], m02: m[2], m10: m[3], m11: m[4], m12: m[5] }
}

/** Maps the layer's pixels to the image's unit square. */
function layerToImage(t: GradientTransform, width: number, height: number): Mat3 {
  return Matrix.multiply(toMatrix(t), Matrix.scaled(1 / width, 1 / height))
}

/** The crop transform of a `width` × `height` layer whose pixels map to the image by `toImage`. */
function transformFor(toImage: Mat3, width: number, height: number): GradientTransform {
  return fromMatrix(Matrix.multiply(toImage, Matrix.scaled(width, height)))
}

/**
 * The crop transform that draws an image as `local` places it, where `local` maps the image's
 * pixels to the layer's, as the renderer lays out Fill, Fit, and Tile; null when it is singular.
 */
export function imageTransformFromLocalMatrix(
  local: Mat3,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): GradientTransform | null {
  const unit = Matrix.multiply(
    Matrix.scaled(1 / width, 1 / height),
    local,
    Matrix.scaled(imageWidth, imageHeight)
  )
  const inverse = Matrix.invert(unit)
  return inverse ? fromMatrix(inverse) : null
}

/** Where the image's corners fall in the layer's pixels; null for a singular crop. */
export function imageCropQuad(
  t: GradientTransform,
  width: number,
  height: number
): ImageCropQuad | null {
  if (width <= 0 || height <= 0) return null
  const toLayer = Matrix.invert(layerToImage(t, width, height))
  if (!toLayer) return null
  return [
    Matrix.mapPoint(toLayer, { x: 0, y: 0 }),
    Matrix.mapPoint(toLayer, { x: 1, y: 0 }),
    Matrix.mapPoint(toLayer, { x: 1, y: 1 }),
    Matrix.mapPoint(toLayer, { x: 0, y: 1 })
  ]
}

function boundsOf(points: readonly Vector[]): Rect {
  return computeBounds(points.map((point) => ({ ...point, width: 0, height: 0 })))
}

/** The quad's box when its sides run along the axes, as an unturned or quarter-turned image's do. */
function axisAlignedBounds(quad: ImageCropQuad): Rect | null {
  const [a, b, c, d] = quad
  const near = (p: number, q: number) => Math.abs(p - q) < EPSILON
  const upright = near(a.y, b.y) && near(d.y, c.y) && near(a.x, d.x) && near(b.x, c.x)
  const quarter = near(a.x, b.x) && near(d.x, c.x) && near(a.y, d.y) && near(b.y, c.y)
  return upright || quarter ? boundsOf(quad) : null
}

/**
 * The image's box in the layer's pixels while it covers the whole layer, which edits then keep;
 * null when it leaves part of the layer bare or is turned off the axes, which edits leave alone.
 */
export function coveringImageBounds(
  t: GradientTransform,
  width: number,
  height: number
): Rect | null {
  const quad = imageCropQuad(t, width, height)
  const bounds = quad && axisAlignedBounds(quad)
  if (!bounds) return null
  const covers =
    bounds.x <= EPSILON &&
    bounds.y <= EPSILON &&
    bounds.x + bounds.width >= width - EPSILON &&
    bounds.y + bounds.height >= height - EPSILON
  return covers ? bounds : null
}

/** The transform that keeps the image still while the layer is cropped to `rect` of its pixels. */
export function croppedImageTransform(
  t: GradientTransform,
  width: number,
  height: number,
  rect: Rect
): GradientTransform {
  const moved = Matrix.multiply(layerToImage(t, width, height), Matrix.translated(rect.x, rect.y))
  return transformFor(moved, rect.width, rect.height)
}

/**
 * The image moved by `delta` of the layer's pixels behind the layer. An image that covers the
 * layer keeps covering it, so it stops at the layer's edges.
 */
export function pannedImageTransform(
  t: GradientTransform,
  width: number,
  height: number,
  delta: Vector
): GradientTransform {
  let { x: dx, y: dy } = delta
  const bounds = coveringImageBounds(t, width, height)
  if (bounds) {
    dx = clamp(dx, width - (bounds.x + bounds.width), -bounds.x)
    dy = clamp(dy, height - (bounds.y + bounds.height), -bounds.y)
  }
  return transformFor(
    Matrix.multiply(layerToImage(t, width, height), Matrix.translated(-dx, -dy)),
    width,
    height
  )
}

/** The smallest scale about `anchor` that keeps an image with `bounds` over the whole layer. */
function minCoverScale(bounds: Rect, anchor: Vector, width: number, height: number): number {
  let scale = MIN_IMAGE_SCALE
  const sides: Array<[from: number, to: number, edge: number]> = [
    [anchor.x, bounds.x, 0],
    [anchor.x, bounds.x + bounds.width, width],
    [anchor.y, bounds.y, 0],
    [anchor.y, bounds.y + bounds.height, height]
  ]
  for (const [from, to, edge] of sides) {
    const span = to - from
    // A side the anchor sits on stays put; the others must still reach past the layer's edge.
    if (Math.abs(span) > EPSILON) scale = Math.max(scale, (edge - from) / span)
  }
  return scale
}

export interface ImageScaleOptions {
  /** Scale about the image's centre instead of the opposite corner, as Alt does. */
  fromCenter?: boolean
}

/**
 * The image scaled by dragging its `corner` to `pointer`, in the layer's pixels. It keeps its
 * proportions and scales about the opposite corner or its centre; one that covers the layer stops
 * shrinking where it would stop covering it.
 */
export function scaledImageTransform(
  t: GradientTransform,
  width: number,
  height: number,
  corner: ImageCropCorner,
  pointer: Vector,
  options: ImageScaleOptions = {}
): GradientTransform {
  const quad = imageCropQuad(t, width, height)
  if (!quad) return t
  const dragged = quad[corner]
  const anchor = options.fromCenter
    ? { x: (quad[0].x + quad[2].x) / 2, y: (quad[0].y + quad[2].y) / 2 }
    : quad[(corner + 2) % 4]
  const dx = dragged.x - anchor.x
  const dy = dragged.y - anchor.y
  const length = dx * dx + dy * dy
  if (length < EPSILON) return t
  let scale = Math.max(
    MIN_IMAGE_SCALE,
    ((pointer.x - anchor.x) * dx + (pointer.y - anchor.y) * dy) / length
  )
  const bounds = coveringImageBounds(t, width, height)
  if (bounds) scale = Math.max(scale, minCoverScale(bounds, anchor, width, height))
  const about = Matrix.multiply(
    Matrix.translated(anchor.x, anchor.y),
    Matrix.scaled(1 / scale, 1 / scale),
    Matrix.translated(-anchor.x, -anchor.y)
  )
  return transformFor(Matrix.multiply(layerToImage(t, width, height), about), width, height)
}

/** Which way each handle moves the layer's edges: −1 its left or top, 1 its right or bottom. */
const HANDLE_SIDES: Record<HandlePosition, readonly [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0]
}

export interface CropResizeOptions {
  /** Keep the layer's proportions, as Shift does. */
  keepRatio?: boolean
  /** Crop both opposite edges alike, as Alt does. */
  fromCenter?: boolean
  /** The box the crop must stay inside: the image's, while it covers the layer. */
  limit?: Rect | null
}

/** How far a side may reach from `anchor`, which sits `fraction` of the way across it. */
function maxExtent(anchor: number, fraction: number, low: number, high: number): number {
  let max = Number.POSITIVE_INFINITY
  if (fraction > 0) max = Math.min(max, (anchor - low) / fraction)
  if (fraction < 1) max = Math.min(max, (high - anchor) / (1 - fraction))
  return Math.max(MIN_CROP_SIZE, max)
}

/** Where `size` must start for `anchor` to sit `fraction` of the way across a side. */
function sideStart(anchor: number, fraction: number, size: number) {
  return anchor - fraction * size
}

/**
 * The part of a `width` × `height` layer, in its own pixels, left after dragging the crop
 * `handle` to `pointer`. The opposite edge or corner stays, or the centre with `fromCenter`;
 * the crop never turns inside out and stays inside `limit`.
 */
export function resizedCropRect(
  handle: HandlePosition,
  width: number,
  height: number,
  pointer: Vector,
  options: CropResizeOptions = {}
): Rect {
  const [sx, sy] = HANDLE_SIDES[handle]
  /** How far across each axis the point that stays sits: the far side, or the middle. */
  const fraction = (side: number) => {
    if (options.fromCenter || side === 0) return 0.5
    return side < 0 ? 1 : 0
  }
  const fx = fraction(sx)
  const fy = fraction(sy)
  const ax = fx * width
  const ay = fy * height
  const extent = (side: number, f: number, anchor: number, value: number, size: number) =>
    side === 0 ? size : Math.max(MIN_CROP_SIZE, (side * (value - anchor)) / (side < 0 ? f : 1 - f))
  let w = extent(sx, fx, ax, pointer.x, width)
  let h = extent(sy, fy, ay, pointer.y, height)
  if (options.keepRatio && width > 0 && height > 0) {
    if (sx !== 0 && sy !== 0) {
      const k = Math.max(w / width, h / height)
      w = width * k
      h = height * k
    } else if (sx !== 0) h = (w * height) / width
    else w = (h * width) / height
  }
  const limit = options.limit
  if (limit) {
    const maxW = maxExtent(ax, fx, limit.x, limit.x + limit.width)
    const maxH = maxExtent(ay, fy, limit.y, limit.y + limit.height)
    if (options.keepRatio) {
      const k = Math.min(1, maxW / w, maxH / h)
      w *= k
      h *= k
    } else {
      w = Math.min(w, maxW)
      h = Math.min(h, maxH)
    }
  }
  return { x: sideStart(ax, fx, w), y: sideStart(ay, fy, h), width: w, height: h }
}

export interface ImageCropLayout {
  /** The layer's corners on screen. */
  frame: ImageCropQuad
  /** The image's corners on screen. */
  image: ImageCropQuad
  /** Whether the layer's edges crop; reframing works on every layer. */
  croppable: boolean
}

export type ImageCropHit =
  | { kind: 'crop'; handle: HandlePosition }
  | { kind: 'scale'; corner: ImageCropCorner }
  | { kind: 'pan' }

/** Where the image and the layer of an edited image fill sit on screen. */
export function imageCropLayout(
  t: GradientTransform,
  width: number,
  height: number,
  croppable: boolean,
  toScreen: (local: Vector) => Vector
): ImageCropLayout | null {
  const quad = imageCropQuad(t, width, height)
  if (!quad) return null
  const map = (points: ImageCropQuad): ImageCropQuad => [
    toScreen(points[0]),
    toScreen(points[1]),
    toScreen(points[2]),
    toScreen(points[3])
  ]
  const frame: ImageCropQuad = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ]
  return { frame: map(frame), image: map(quad), croppable }
}

function midpoint(a: Vector, b: Vector): Vector {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** The crop handles on screen, corners first, as the layer's selection handles are named. */
export function imageCropHandles(
  frame: ImageCropQuad
): Array<{ handle: HandlePosition; point: Vector }> {
  const [nw, ne, se, sw] = frame
  return [
    { handle: 'nw', point: nw },
    { handle: 'ne', point: ne },
    { handle: 'se', point: se },
    { handle: 'sw', point: sw },
    { handle: 'n', point: midpoint(nw, ne) },
    { handle: 'e', point: midpoint(ne, se) },
    { handle: 's', point: midpoint(se, sw) },
    { handle: 'w', point: midpoint(sw, nw) }
  ]
}

function distanceToSegment(point: Vector, a: Vector, b: Vector): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const along = length > 0 ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0, 1) : 0
  return Math.hypot(point.x - (a.x + along * dx), point.y - (a.y + along * dy))
}

/** Whether `point` is inside the convex `quad`, whichever way round its corners run. */
export function quadContains(quad: ImageCropQuad, point: Vector): boolean {
  let sign = 0
  for (let index = 0; index < 4; index++) {
    const a = quad[index]
    const b = quad[(index + 1) % 4]
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
    if (Math.abs(cross) < EPSILON) continue
    if (sign === 0) sign = Math.sign(cross)
    else if (Math.sign(cross) !== sign) return false
  }
  return true
}

const EDGES: ReadonlyArray<[HandlePosition, ImageCropCorner, ImageCropCorner]> = [
  ['n', 0, 1],
  ['e', 1, 2],
  ['s', 2, 3],
  ['w', 3, 0]
]

/**
 * What a press at a screen point takes: a crop corner, then an image corner, then a crop edge
 * anywhere along it, then the image or the layer, which drag the image; null outside them all.
 */
export function hitTestImageCrop(layout: ImageCropLayout, point: Vector): ImageCropHit | null {
  const near = (target: Vector) =>
    Math.hypot(point.x - target.x, point.y - target.y) <= IMAGE_CROP_HANDLE.hitRadius
  if (layout.croppable) {
    for (const { handle, point: corner } of imageCropHandles(layout.frame).slice(0, 4))
      if (near(corner)) return { kind: 'crop', handle }
  }
  for (const corner of [0, 1, 2, 3] as const)
    if (near(layout.image[corner])) return { kind: 'scale', corner }
  if (layout.croppable) {
    for (const [handle, from, to] of EDGES) {
      const distance = distanceToSegment(point, layout.frame[from], layout.frame[to])
      if (distance <= IMAGE_CROP_HANDLE.edgeHitDistance) return { kind: 'crop', handle }
    }
  }
  if (quadContains(layout.image, point) || quadContains(layout.frame, point)) return { kind: 'pan' }
  return null
}

/**
 * The screen direction a handle pulls in, from the middle of what it resizes, for the resize
 * cursor; null for dragging the image, which moves it every way.
 */
export function imageCropHitDirection(layout: ImageCropLayout, hit: ImageCropHit): Vector | null {
  if (hit.kind === 'pan') return null
  const quad = hit.kind === 'crop' ? layout.frame : layout.image
  const center = midpoint(quad[0], quad[2])
  const target =
    hit.kind === 'crop'
      ? (imageCropHandles(quad).find((entry) => entry.handle === hit.handle)?.point ?? center)
      : quad[hit.corner]
  return { x: target.x - center.x, y: target.y - center.y }
}
