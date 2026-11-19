import { arrowCapOverflow } from './arrow-caps'
import { getAxisAlignedWorldBounds } from './coordinate'
import type { SceneGraph } from './graph'
import type { Rect, Vector } from './primitives'
import { textLinesReach } from './text/overflow'
import type { Effect, SceneNode, Stroke, StrokeCap, StrokeJoin, VectorNetwork } from './types'

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

export function rotatePoint(px: number, py: number, cx: number, cy: number, rad: number): Vector {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: cx + (px - cx) * cos - (py - cy) * sin,
    y: cy + (px - cx) * sin + (py - cy) * cos
  }
}

export function rotatedCorners(
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  rotationDeg: number
): [Vector, Vector, Vector, Vector] {
  const rad = degToRad(rotationDeg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [
    { x: cx + -hw * cos - -hh * sin, y: cy + -hw * sin + -hh * cos },
    { x: cx + hw * cos - -hh * sin, y: cy + hw * sin + -hh * cos },
    { x: cx + hw * cos - hh * sin, y: cy + hw * sin + hh * cos },
    { x: cx + -hw * cos - hh * sin, y: cy + -hw * sin + hh * cos }
  ]
}

export function rotatedBBox(
  x: number,
  y: number,
  w: number,
  h: number,
  rotationDeg: number
): { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number } {
  if (rotationDeg === 0) {
    return {
      left: x,
      right: x + w,
      top: y,
      bottom: y + h,
      centerX: x + w / 2,
      centerY: y + h / 2
    }
  }
  const corners = rotatedCorners(x + w / 2, y + h / 2, w / 2, h / 2, rotationDeg)
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity
  for (const c of corners) {
    left = Math.min(left, c.x)
    right = Math.max(right, c.x)
    top = Math.min(top, c.y)
    bottom = Math.max(bottom, c.y)
  }
  return { left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
}

export interface VisualBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type BoundsAccumulator = VisualBounds

function createBoundsAccumulator(): BoundsAccumulator {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
}

function includePoint(bounds: BoundsAccumulator, x: number, y: number): void {
  bounds.minX = Math.min(bounds.minX, x)
  bounds.minY = Math.min(bounds.minY, y)
  bounds.maxX = Math.max(bounds.maxX, x)
  bounds.maxY = Math.max(bounds.maxY, y)
}

function includeRect(bounds: BoundsAccumulator, rect: Rect): void {
  includePoint(bounds, rect.x, rect.y)
  includePoint(bounds, rect.x + rect.width, rect.y + rect.height)
}

function boundsToRect(bounds: BoundsAccumulator): Rect {
  return bounds.minX === Infinity
    ? { x: 0, y: 0, width: 0, height: 0 }
    : {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY
      }
}

export function computeBounds(items: Iterable<Rect>): Rect {
  const bounds = createBoundsAccumulator()
  for (const item of items) includeRect(bounds, item)
  return boundsToRect(bounds)
}

export function polygonVertices(node: {
  width: number
  height: number
  pointCount: number
  type: string
  starInnerRadius: number
}): Vector[] {
  const cx = node.width / 2
  const cy = node.height / 2
  const rx = node.width / 2
  const ry = node.height / 2
  const pointCount = Math.max(3, node.pointCount)
  const isStar = node.type === 'STAR'
  const innerRatio = isStar ? node.starInnerRadius : 1
  const totalPoints = isStar ? pointCount * 2 : pointCount
  const angleOffset = -Math.PI / 2

  return Array.from({ length: totalPoints }, (_, index) => {
    const angle = angleOffset + (2 * Math.PI * index) / totalPoints
    const isInner = isStar && index % 2 === 1
    const radius = isInner ? innerRatio : 1
    return {
      x: cx + rx * radius * Math.cos(angle),
      y: cy + ry * radius * Math.sin(angle)
    }
  })
}

/**
 * What shapes how far a layer's stroke reaches past its box: its type, since a line is stroked to
 * one side, and its join and miter limit, for the tips mitered path corners reach.
 */
export interface StrokeShape {
  type?: string
  strokeJoin?: StrokeJoin
  strokeMiterLimit?: number
}

export function strokeOverflow(
  strokes?: Stroke[],
  fallbackCap?: StrokeCap,
  network?: VectorNetwork | null,
  shape?: StrokeShape
): number {
  const line = shape?.type === 'LINE'
  // Open segments enclose nothing to take a side of, so their strokes draw centred; a network
  // with closed regions still strokes those on their side.
  const enclosed = new Set(network?.regions.flatMap((region) => region.loops.flat()))
  const open = network?.segments.some((_, index) => !enclosed.has(index)) ?? false
  const sided = !network || network.regions.length > 0
  let overflow = 0
  for (const stroke of strokes ?? []) {
    if (!stroke.visible) continue
    const align = sided ? stroke.align : 'CENTER'
    let extra = open ? stroke.weight / 2 : 0
    if (line || align === 'OUTSIDE') extra = stroke.weight
    else if (align === 'CENTER') extra = stroke.weight / 2
    const miter = network
      ? miterRatio(network, stroke.join ?? shape?.strokeJoin, shape?.strokeMiterLimit)
      : 1
    overflow = Math.max(overflow, extra * miter)
  }
  // A line's heads sit on its stroke's middle, half a weight off the line.
  const heads = arrowCapOverflow(strokes, fallbackCap, network)
  return Math.max(overflow, heads > 0 && line ? heads + overflow / 2 : heads)
}

/** The direction a segment leaves `vertex` in, along its handle when it has one. */
function leaving(network: VectorNetwork, index: number, vertex: number): Vector {
  const segment = network.segments[index]
  const atStart = segment.start === vertex
  const handle = atStart ? segment.tangentStart : segment.tangentEnd
  if (handle.x !== 0 || handle.y !== 0) return handle
  const from = network.vertices[vertex]
  const to = network.vertices[atStart ? segment.end : segment.start]
  return { x: to.x - from.x, y: to.y - from.y }
}

/**
 * How far past half the stroke the sharpest mitered corner reaches, as a multiple: a corner of
 * angle θ mitres out to 1/sin(θ/2), unless that passes the miter limit and it bevels instead.
 * Corners are the vertices exactly two segments meet at, as the stroke joins them.
 */
function miterRatio(network: VectorNetwork, join: StrokeJoin | undefined, limit = 4): number {
  const meeting = new Map<number, number[]>()
  for (const [index, segment] of network.segments.entries()) {
    for (const vertex of new Set([segment.start, segment.end])) {
      meeting.set(vertex, [...(meeting.get(vertex) ?? []), index])
    }
  }
  let ratio = 1
  for (const [vertex, indices] of meeting) {
    if (indices.length !== 2) continue
    if ((network.vertices[vertex].strokeJoin ?? join ?? 'MITER') !== 'MITER') continue
    const a = leaving(network, indices[0], vertex)
    const b = leaving(network, indices[1], vertex)
    const lengths = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y)
    if (lengths === 0) continue
    const angle = Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / lengths)))
    const miter = 1 / Math.sin(angle / 2)
    if (miter <= limit) ratio = Math.max(ratio, miter)
  }
  return ratio
}

const BLUR_SIGMA_PER_RADIUS = 0.43

/**
 * The Gaussian sigma that draws a Figma blur radius as Figma does. Measured on Figma 126 exports,
 * layer blur, both shadows, and background blur fall off as a Gaussian of 0.43 × radius; Figma's
 * SVG export writes radius / 2, which is wider (`packages/core/tests/canvas/blur.test.ts`).
 */
export function blurSigma(radius: number): number {
  return Math.max(0, radius) * BLUR_SIGMA_PER_RADIUS
}

/** The Figma blur radius that draws a Gaussian of `sigma`, the inverse of `blurSigma`. */
export function blurRadiusForSigma(sigma: number): number {
  return Math.max(0, sigma) / BLUR_SIGMA_PER_RADIUS
}

export function effectOverflow(effects?: Effect[]) {
  let left = 0
  let right = 0
  let top = 0
  let bottom = 0

  for (const effect of effects ?? []) {
    if (!effect.visible) continue
    if (
      effect.type !== 'DROP_SHADOW' &&
      effect.type !== 'LAYER_BLUR' &&
      effect.type !== 'FOREGROUND_BLUR'
    ) {
      continue
    }
    const blurSpread = effect.radius + effect.spread
    left = Math.max(left, blurSpread + Math.max(0, -effect.offset.x))
    right = Math.max(right, blurSpread + Math.max(0, effect.offset.x))
    top = Math.max(top, blurSpread + Math.max(0, -effect.offset.y))
    bottom = Math.max(bottom, blurSpread + Math.max(0, effect.offset.y))
  }

  return { left, right, top, bottom }
}

/** Axis-aligned canvas box around the layers, through each one's rotation, flips, and ancestors. */
export function computeAbsoluteBounds(
  nodes: Iterable<SceneNode>,
  graph: Pick<SceneGraph, 'getNode'>
): Rect {
  const bounds = createBoundsAccumulator()
  for (const n of nodes) includeRect(bounds, getAxisAlignedWorldBounds(n, graph))
  return boundsToRect(bounds)
}

export function computeVisualBounds(
  nodes: Iterable<
    {
      id: string
      width: number
      height: number
      rotation?: number
      flipX?: boolean
      flipY?: boolean
      strokes?: Stroke[]
      strokeCap?: StrokeCap
      vectorNetwork?: VectorNetwork | null
      effects?: Effect[]
    } & StrokeShape
  >,
  getAbsolutePosition: (id: string) => Vector
): Rect {
  const bounds = createBoundsAccumulator()

  for (const n of nodes) {
    const abs = unturnedTopLeft(n, getAbsolutePosition(n.id))
    const bbox = rotatedBBox(abs.x, abs.y, n.width, n.height, n.rotation ?? 0)
    const stroke = strokeOverflow(n.strokes, n.strokeCap, n.vectorNetwork, n)
    const effects = effectOverflow(n.effects)
    includePoint(bounds, bbox.left - stroke - effects.left, bbox.top - stroke - effects.top)
    includePoint(bounds, bbox.right + stroke + effects.right, bbox.bottom + stroke + effects.bottom)
  }

  return boundsToRect(bounds)
}

export interface VisualBoundsNode {
  id: string
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
  strokes?: Stroke[]
  strokeCap?: StrokeCap
  vectorNetwork?: VectorNetwork | null
  effects?: Effect[]
  fillGeometry?: Array<{ commandsBlob: Uint8Array }>
  strokeGeometry?: Array<{ commandsBlob: Uint8Array }>
  childIds?: string[]
  visible?: boolean
  type?: string
  clipsContent?: boolean
  fontSize?: number
  textDecoration?: string
  textUnderlineOffset?: number | null
  textDecorationThickness?: number | null
  derivedTextHeight?: number | null
  textAlignVertical?: string
}

export function unionVisualBounds(
  a: VisualBounds | null,
  b: VisualBounds | null
): VisualBounds | null {
  if (!a) return b
  if (!b) return a
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  }
}

export function intersectVisualBounds(a: VisualBounds, b: VisualBounds): VisualBounds | null {
  const minX = Math.max(a.minX, b.minX)
  const minY = Math.max(a.minY, b.minY)
  const maxX = Math.min(a.maxX, b.maxX)
  const maxY = Math.min(a.maxY, b.maxY)
  return minX < maxX && minY < maxY ? { minX, minY, maxX, maxY } : null
}

/**
 * Coordinate pairs per path blob command: 0=close, 1=move, 2=line,
 * 3=quad (glyph-derived blobs are quad-heavy), 4=cubic. Unknown → null so
 * walkers stop instead of desyncing into coordinate bytes.
 */
export function geometryCommandCoordCount(command: number): number | null {
  if (command === 0) return 0
  if (command === 1 || command === 2) return 1
  if (command === 3) return 2
  if (command === 4) return 3
  return null
}

export function geometryBlobBounds(paths: Array<{ commandsBlob: Uint8Array }>): Rect | null {
  const bounds = createBoundsAccumulator()

  for (const path of paths) {
    const blob = path.commandsBlob
    const dv = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
    let offset = 0
    while (offset < blob.length) {
      const command = blob[offset++]
      const coords = geometryCommandCoordCount(command)
      if (coords == null) break
      for (let i = 0; i < coords; i++) {
        if (offset + 8 > blob.length) break
        const x = dv.getFloat32(offset, true)
        const y = dv.getFloat32(offset + 4, true)
        includePoint(bounds, x, y)
        offset += 8
      }
    }
  }

  return bounds.minX === Infinity ? null : boundsToRect(bounds)
}

/** How many straight steps a curve is sampled in when its outline is needed as points. */
const OUTLINE_CURVE_STEPS = 8

/**
 * Points along a quad (`command` 3) or cubic (4) from `start`, sampled so the curve's outline can
 * be tested without a path engine. The last coordinate pair is the curve's end.
 */
function curvePoints(
  command: number,
  start: Vector,
  points: readonly Vector[],
  steps: number
): Vector[] {
  const end = points[points.length - 1]
  const sampled: Vector[] = []
  for (let step = 1; step <= steps; step++) {
    const t = step / steps
    const u = 1 - t
    if (command === 3) {
      const control = points[0]
      sampled.push({
        x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
      })
      continue
    }
    const [first, second] = points
    sampled.push({
      x:
        u * u * u * start.x +
        3 * u * u * t * first.x +
        3 * u * t * t * second.x +
        t * t * t * end.x,
      y:
        u * u * u * start.y + 3 * u * u * t * first.y + 3 * u * t * t * second.y + t * t * t * end.y
    })
  }
  return sampled
}

/** One blob's subpaths as polylines in the layer's own coordinates. */
function blobPolylines(blob: Uint8Array, curveSteps: number): Vector[][] {
  const polylines: Vector[][] = []
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
  let offset = 0
  let current: Vector[] = []
  let cursor: Vector = { x: 0, y: 0 }
  const readPoint = (): Vector | null => {
    if (offset + 8 > blob.length) return null
    const point = { x: view.getFloat32(offset, true), y: view.getFloat32(offset + 4, true) }
    offset += 8
    return point
  }
  while (offset < blob.length) {
    const command = blob[offset++]
    const coords = geometryCommandCoordCount(command)
    if (coords === null) break
    if (command === 0) {
      if (current.length > 0) polylines.push(current)
      current = []
      continue
    }
    const points: Vector[] = []
    let complete = true
    for (let index = 0; index < Math.max(coords, 1); index++) {
      const point = readPoint()
      if (!point) {
        complete = false
        break
      }
      points.push(point)
    }
    if (!complete) break
    const end = points[points.length - 1]
    if (command === 1) {
      if (current.length > 0) polylines.push(current)
      current = [end]
    } else if (command === 2) {
      if (current.length === 0) current.push(cursor)
      current.push(end)
    } else {
      if (current.length === 0) current.push(cursor)
      current.push(...curvePoints(command, cursor, points, curveSteps))
    }
    cursor = end
  }
  if (current.length > 0) polylines.push(current)
  return polylines
}

/**
 * The subpaths a layer's geometry blobs draw, as polylines in its own coordinates. Curves are
 * sampled, so a caller can test a point against the outline without a path engine.
 */
export function geometryBlobPolylines(
  paths: Array<{ commandsBlob: Uint8Array }>,
  curveSteps = OUTLINE_CURVE_STEPS
): Vector[][] {
  const polylines: Vector[][] = []
  for (const path of paths) polylines.push(...blobPolylines(path.commandsBlob, curveSteps))
  return polylines
}

type TurnedBox = Pick<VisualBoundsNode, 'width' | 'height' | 'rotation' | 'flipX' | 'flipY'>

/**
 * Where a local point lands relative to the box's unturned top-left, turned about the center and
 * then flipped about it, in the order `getNodeLocalMatrix` composes the same two steps.
 */
function transformLocalPoint(node: TurnedBox, point: Vector): Vector {
  let { x, y } = point
  const rotation = node.rotation ?? 0
  if (rotation !== 0) {
    const rotated = rotatePoint(x, y, node.width / 2, node.height / 2, degToRad(rotation))
    x = rotated.x
    y = rotated.y
  }
  if (node.flipX) x = node.width - x
  if (node.flipY) y = node.height - y
  return { x, y }
}

/**
 * The unturned top-left of a box whose origin (its own 0,0, as `SceneGraph.getAbsolutePosition`
 * returns it) sits at `origin` after the rotation.
 */
function unturnedTopLeft(node: TurnedBox, origin: Vector): Vector {
  // `getAbsolutePosition` maps the box's own origin through the world matrix, flips included.
  const offset = transformLocalPoint(node, { x: 0, y: 0 })
  return { x: origin.x - offset.x, y: origin.y - offset.y }
}

function transformedLocalBounds(node: VisualBoundsNode, local: Rect, abs: Vector): VisualBounds {
  const points = [
    { x: local.x, y: local.y },
    { x: local.x + local.width, y: local.y },
    { x: local.x + local.width, y: local.y + local.height },
    { x: local.x, y: local.y + local.height }
  ].map((point) => transformLocalPoint(node, point))

  return {
    minX: abs.x + Math.min(...points.map((point) => point.x)),
    minY: abs.y + Math.min(...points.map((point) => point.y)),
    maxX: abs.x + Math.max(...points.map((point) => point.x)),
    maxY: abs.y + Math.max(...points.map((point) => point.y))
  }
}

export function nodeVisualBounds(
  node: VisualBoundsNode,
  getAbsolutePosition: (id: string) => Vector
): VisualBounds {
  const abs = unturnedTopLeft(node, getAbsolutePosition(node.id))
  const base = computeVisualBounds([node], getAbsolutePosition)
  let bounds: VisualBounds = {
    minX: base.x,
    minY: base.y,
    maxX: base.x + base.width,
    maxY: base.y + base.height
  }

  const hasNonInsideStroke = node.strokes?.some(
    (stroke) => stroke.visible && stroke.align !== 'INSIDE'
  )
  const localGeometry = geometryBlobBounds([
    ...(node.fillGeometry ?? []),
    ...(hasNonInsideStroke ? (node.strokeGeometry ?? []) : [])
  ])
  if (localGeometry) {
    bounds = unionVisualBounds(bounds, transformedLocalBounds(node, localGeometry, abs)) ?? bounds
  }

  // A fixed-size box lets its lines run past it on the side away from the vertical alignment,
  // and an underline or strikethrough reaches below the last line, turning with the text.
  const reach = textLinesReach(node)
  const above = Math.min(reach.minY, 0)
  const below = Math.max(reach.maxY, node.height) + textDecorationOverflow(node)
  if (above < 0 || below > node.height) {
    const lines = { x: 0, y: above, width: node.width, height: below - above }
    bounds = unionVisualBounds(bounds, transformedLocalBounds(node, lines, abs)) ?? bounds
  }

  return bounds
}

/** How far a text node's underline or strikethrough reaches below its box. */
export function textDecorationOverflow(node: VisualBoundsNode): number {
  if (node.type !== 'TEXT' || !node.textDecoration || node.textDecoration === 'NONE') return 0
  const fontSize = node.fontSize ?? 14
  const underlineOffset = node.textUnderlineOffset ?? fontSize * 0.18
  const thickness = node.textDecorationThickness ?? Math.max(1, fontSize / 16)
  return underlineOffset + thickness + fontSize * 0.35
}

function collectDescendantVisualBounds(
  nodeId: string,
  getNode: (id: string) => VisualBoundsNode | undefined,
  getAbsolutePosition: (id: string) => Vector,
  clip: VisualBounds | null = null
): VisualBounds | null {
  const node = getNode(nodeId)
  if (!node?.visible) return null

  const own = nodeVisualBounds(node, getAbsolutePosition)
  let bounds = clip ? intersectVisualBounds(own, clip) : own

  const isClippableContainer =
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  let childClip = clip
  if (isClippableContainer && node.clipsContent) {
    // The frame's own drawn box, so a turned frame clips where it is drawn. For an unturned,
    // unflipped frame this is the same box as its position and size give.
    const abs = unturnedTopLeft(node, getAbsolutePosition(node.id))
    const nodeClip = transformedLocalBounds(
      node,
      { x: 0, y: 0, width: node.width, height: node.height },
      abs
    )
    childClip = childClip ? intersectVisualBounds(childClip, nodeClip) : nodeClip
    if (!childClip) return bounds
  }

  for (const childId of node.childIds ?? []) {
    bounds = unionVisualBounds(
      bounds,
      collectDescendantVisualBounds(childId, getNode, getAbsolutePosition, childClip)
    )
  }

  return bounds
}

export function computeDescendantVisualBounds(
  nodeIds: string[],
  getNode: (id: string) => VisualBoundsNode | undefined,
  getAbsolutePosition: (id: string) => Vector
): VisualBounds | null {
  let bounds: VisualBounds | null = null
  for (const nodeId of nodeIds) {
    bounds = unionVisualBounds(
      bounds,
      collectDescendantVisualBounds(nodeId, getNode, getAbsolutePosition)
    )
  }
  return bounds
}
