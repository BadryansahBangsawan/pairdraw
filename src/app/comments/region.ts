import type { CommentRegion } from '@pairdraw/scene-graph'
import type { VisualBounds } from '@pairdraw/scene-graph/geometry'
import type { Vector } from '@pairdraw/scene-graph/primitives'

/** Points a stored stroke keeps; enough for a hand-drawn ring, small enough to save with a comment. */
export const REGION_POINT_LIMIT = 128

/** Screen pixels a stroke is drawn at, before zoom turns it into canvas units. */
const STROKE_SCREEN_WIDTH = 2

/** A stroke never gets thinner or thicker than this in canvas units, however far the person zoomed. */
const STROKE_MIN_WIDTH = 0.5
const STROKE_MAX_WIDTH = 8

const round = (value: number) => Math.round(value * 100) / 100
const same = (first: Vector, second: Vector) => first.x === second.x && first.y === second.y

/** The stroke without points that repeat the one before, which a pointer always sends some of. */
function dedupe(points: readonly Vector[]): Vector[] {
  const kept: Vector[] = []
  let last: Vector | undefined
  for (const point of points) {
    if (!last || !same(last, point)) kept.push(point)
    last = point
  }
  return kept
}

/** Distance of `point` from the segment `start`–`end`. */
function distanceToSegment(point: Vector, start: Vector, end: Vector): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
  )
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

/** Ramer–Douglas–Peucker over `points` (indices), keeping the end points. */
function reduce(points: readonly Vector[], tolerance: number): Vector[] {
  if (points.length <= 2) return [...points]
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const range = stack.pop()
    if (!range) break
    const [first, last] = range
    const start = points[first]
    const end = points[last]
    let worst = -1
    let worstDistance = tolerance
    for (let index = first + 1; index < last; index++) {
      const distance = distanceToSegment(points[index], start, end)
      if (distance > worstDistance) {
        worst = index
        worstDistance = distance
      }
    }
    if (worst === -1) continue
    keep[worst] = 1
    stack.push([first, worst], [worst, last])
  }
  return points.filter((_, index) => keep[index] === 1)
}

/**
 * A stroke as the thread stores it: its points thinned to what a person would still recognise as
 * the shape they drew. Tolerances grow until the stroke fits `maxPoints`, so a long freehand ring
 * stays bounded without losing its ends.
 */
export function simplifyStroke(
  points: readonly Vector[],
  tolerance: number,
  maxPoints = REGION_POINT_LIMIT
): Vector[] {
  const unique = dedupe(points)
  if (unique.length <= 2) return unique
  let simplified = reduce(unique, Math.max(tolerance, 0))
  let step = Math.max(tolerance, 0.01)
  // A tolerance of 0 never converges on a jagged stroke, so each miss at least doubles it.
  for (let guard = 0; simplified.length > maxPoints && guard < 32; guard++) {
    step *= 2
    simplified = reduce(unique, step)
  }
  if (simplified.length <= maxPoints) return simplified
  return [unique[0], unique[unique.length - 1]]
}

/**
 * A stroke drawn on the canvas, as a thread keeps it: its points relative to the pin at the
 * stroke's top-left corner, its width in canvas units, and the box it spans. Null when the
 * stroke is too small to be a region — a click, not a circle.
 */
export function strokeToComment(
  points: readonly Vector[],
  zoom: number
): { at: Vector; region: CommentRegion } | null {
  const simplified = simplifyStroke(points, zoom > 0 ? 1 / zoom : 1)
  if (simplified.length < 2) return null
  const width = round(
    Math.min(STROKE_MAX_WIDTH, Math.max(STROKE_MIN_WIDTH, STROKE_SCREEN_WIDTH / (zoom || 1)))
  )
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { x, y } of simplified) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (maxX - minX === 0 && maxY - minY === 0) return null
  const pad = width / 2
  const at = { x: round(minX - pad), y: round(minY - pad) }
  return {
    at,
    region: {
      points: simplified.map(({ x, y }) => [round(x - at.x), round(y - at.y)]),
      width,
      bounds: { minX: 0, minY: 0, maxX: round(maxX - at.x + pad), maxY: round(maxY - at.y + pad) }
    }
  }
}

/** The region's box on the page, in canvas units, for a pin at `origin`. */
export function regionCanvasBounds(region: CommentRegion, origin: Vector): VisualBounds {
  return {
    minX: origin.x + region.bounds.minX,
    minY: origin.y + region.bounds.minY,
    maxX: origin.x + region.bounds.maxX,
    maxY: origin.y + region.bounds.maxY
  }
}

/** A stroke as the overlay draws it: a box in screen pixels and the path inside it. */
export interface StrokeBox {
  left: number
  top: number
  width: number
  height: number
  /** Path points relative to the box's top-left corner. */
  d: string
  /** Stroke width in screen pixels. */
  stroke: number
}

/** The box and path a stroke of `points` covers, in screen pixels at `zoom`. */
function strokeBox(points: readonly Vector[], zoom: number, stroke: number): StrokeBox | null {
  if (points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { x, y } of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const pad = stroke / 2
  const left = minX * zoom - pad
  const top = minY * zoom - pad
  const d = points
    .map(
      ({ x, y }, index) =>
        `${index === 0 ? 'M' : 'L'}${round(x * zoom - left)} ${round(y * zoom - top)}`
    )
    .join(' ')
  return {
    left: round(left),
    top: round(top),
    width: Math.max(1, round((maxX - minX) * zoom + stroke)),
    height: Math.max(1, round((maxY - minY) * zoom + stroke)),
    d,
    stroke: round(stroke)
  }
}

/** The box a thread's region covers on screen, for a pin at `origin` (canvas units) and `zoom`. */
export function regionStrokeBox(
  region: CommentRegion,
  origin: Vector,
  zoom: number
): StrokeBox | null {
  const points = region.points.map(([x, y]) => ({ x: x + origin.x, y: y + origin.y }))
  return strokeBox(points, zoom, Math.max(1, region.width * zoom))
}

/** The box a stroke still being drawn covers on screen, from its canvas points and `zoom`. */
export function liveStrokeBox(points: readonly Vector[], zoom: number): StrokeBox | null {
  return strokeBox(points, zoom, STROKE_SCREEN_WIDTH)
}

/**
 * A CSS mask that paints `box` in the current color, so the stroke is drawn without an `<svg>`
 * element and without scripts running in the page.
 */
export function strokeMaskURL(box: StrokeBox): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" ` +
    `viewBox="0 0 ${box.width} ${box.height}"><path d="${box.d}" fill="none" ` +
    `stroke="#fff" stroke-width="${box.stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
