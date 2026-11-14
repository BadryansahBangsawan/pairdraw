import type { VectorNetwork, VectorSegment } from '@pairdraw/scene-graph'
import Matrix, { type Mat3 } from '@pairdraw/scene-graph/matrix'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'
import { cloneVectorNetwork } from '@pairdraw/scene-graph/vector-network'

import type { HandlePosition } from '#core/geometry/transform-zones'

/** A side shorter than this is flat: dragging across it scales nothing. */
const FLAT_SIDE = 1e-6

/**
 * The points a selection on a path being edited moves and transforms: the selected points and the
 * ends of the selected segments, each once and in range.
 */
export function selectedVectorPoints(
  network: { vertices: readonly Vector[]; segments: readonly VectorSegment[] },
  vertexIndices: Iterable<number>,
  segmentIndices: Iterable<number>
): number[] {
  const points = new Set(vertexIndices)
  for (const index of segmentIndices) {
    const segment = network.segments.at(index)
    if (!segment) continue
    points.add(segment.start)
    points.add(segment.end)
  }
  return [...points].filter((index) => index >= 0 && index < network.vertices.length)
}

/**
 * The points a transform box takes from a selection: as in Figma, it appears once two parts are
 * selected, points or segments, so a lone point or segment keeps its own handles. Empty otherwise.
 */
export function transformBoxPoints(
  network: { vertices: readonly Vector[]; segments: readonly VectorSegment[] },
  vertexIndices: ReadonlySet<number>,
  segmentIndices: ReadonlySet<number>
): number[] {
  if (vertexIndices.size + segmentIndices.size < 2) return []
  return selectedVectorPoints(network, vertexIndices, segmentIndices)
}

/**
 * The box around some points of a path, which a transform box shows for two points or more; `null`
 * for fewer. A row or a column of points makes a box flat along the other axis.
 */
export function vectorPointsBox(
  vertices: readonly Vector[],
  points: readonly number[]
): Rect | null {
  if (points.length < 2) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const index of points) {
    const { x, y } = vertices[index]
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** The four corners of a box mapped through a matrix, clockwise from its top left. */
export function boxCorners(box: Rect, matrix: Mat3 = Matrix.identity()): Vector[] {
  const { x, y, width, height } = box
  const corners = Matrix.mapPoints(matrix, [
    x,
    y,
    x + width,
    y,
    x + width,
    y + height,
    x,
    y + height
  ])
  return [0, 2, 4, 6].map((offset) => ({ x: corners[offset], y: corners[offset + 1] }))
}

/**
 * Moves some points of a path through a matrix, turning and stretching the handles that leave them
 * with them, as a transform box does. The other points and their handles stay where they are.
 */
export function transformVectorPoints(
  network: VectorNetwork,
  points: Iterable<number>,
  matrix: Mat3
): VectorNetwork {
  const moved = new Set(points)
  const next = cloneVectorNetwork(network)
  const linear = (v: Vector): Vector => ({
    x: matrix[0] * v.x + matrix[1] * v.y,
    y: matrix[3] * v.x + matrix[4] * v.y
  })
  for (const index of moved) {
    const vertex = next.vertices.at(index)
    if (!vertex) continue
    next.vertices[index] = { ...vertex, ...Matrix.mapPoint(matrix, vertex) }
  }
  for (const segment of next.segments) {
    if (moved.has(segment.start)) segment.tangentStart = linear(segment.tangentStart)
    if (moved.has(segment.end)) segment.tangentEnd = linear(segment.tangentEnd)
  }
  return next
}

export interface ScaleBoxOptions {
  /** Shift: keep the box's proportions. */
  uniform?: boolean
  /** ⌥/Alt: scale about the box's centre instead of the side or corner opposite the handle. */
  fromCenter?: boolean
}

/** Which way a handle moves its sides: -1 the left or top one, 1 the right or bottom one. */
function handleSides(handle: HandlePosition): Vector {
  const side = (forward: string, back: string) => {
    if (handle.includes(forward)) return 1
    return handle.includes(back) ? -1 : 0
  }
  return { x: side('e', 'w'), y: side('s', 'n') }
}

function axisScale(side: number, length: number, offset: number, fromCenter: boolean) {
  if (side === 0 || length < FLAT_SIDE) return null
  return (length + side * offset * (fromCenter ? 2 : 1)) / length
}

/** Whether dragging a handle of a box scales anything: a flat side has nothing to stretch. */
export function scalesBox(box: Rect, handle: HandlePosition): boolean {
  const sides = handleSides(handle)
  return (sides.x !== 0 && box.width >= FLAT_SIDE) || (sides.y !== 0 && box.height >= FLAT_SIDE)
}

/**
 * The matrix that drags a handle of a box by `offset`, as Figma's transform box scales selected
 * points: from the opposite side or corner, or with `fromCenter` from the centre. `uniform` scales
 * both axes alike by the larger stretch, and an edge handle then grows the box about its centre
 * line. Dragging past the opposite side flips the points.
 */
export function scaleBoxMatrix(
  box: Rect,
  handle: HandlePosition,
  offset: Vector,
  options: ScaleBoxOptions = {}
): Mat3 {
  const fromCenter = options.fromCenter ?? false
  const sides = handleSides(handle)
  let sx = axisScale(sides.x, box.width, offset.x, fromCenter)
  let sy = axisScale(sides.y, box.height, offset.y, fromCenter)
  if (options.uniform) {
    const scale =
      sx !== null && sy !== null ? (Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy) : (sx ?? sy)
    sx = scale
    sy = scale
  }
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const anchor = (side: number, start: number, length: number, middle: number) => {
    if (fromCenter || side === 0) return middle
    return side > 0 ? start : start + length
  }
  return Matrix.scaled(
    sx ?? 1,
    sy ?? 1,
    anchor(sides.x, box.x, box.width, center.x),
    anchor(sides.y, box.y, box.height, center.y)
  )
}

/**
 * The angle, in radians clockwise on the canvas, that turns `from` to `to` about `center`, as a
 * drag outside a corner of a transform box turns the points; `snapDegrees` rounds it, as Shift does.
 */
export function rotationAbout(center: Vector, from: Vector, to: Vector, snapDegrees = 0): number {
  const angle =
    Math.atan2(to.y - center.y, to.x - center.x) - Math.atan2(from.y - center.y, from.x - center.x)
  if (snapDegrees <= 0) return angle
  const step = (snapDegrees * Math.PI) / 180
  return Math.round(angle / step) * step
}

/** The matrix that turns points by `angle` radians clockwise about `center`. */
export function rotateBoxMatrix(center: Vector, angle: number): Mat3 {
  return Matrix.rotated(angle, center.x, center.y)
}
