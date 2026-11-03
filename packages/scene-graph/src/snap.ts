import { rotatedBBox } from './geometry'
import type { Rect } from './primitives'
import type { SceneNode } from './types'

const DEFAULT_SNAP_THRESHOLD = 5

export interface SnapGuide {
  axis: 'x' | 'y'
  position: number
  from: number
  to: number
  /** Points along the guide that lined up, marked with a cross: a guide through path vertices. */
  marks?: number[]
  /**
   * An equal-spacing indicator instead of an alignment line: the gap between two neighbours, from
   * `from` to `to` on the line at `position`. A gap along x is a horizontal line, so its `axis` is
   * `'y'`, as for any horizontal guide; the renderer caps both ends and labels the gap's size.
   */
  spacing?: boolean
}

export interface SnapResult {
  dx: number
  dy: number
  guides: SnapGuide[]
}

function getEdges(node: SceneNode) {
  return rotatedBBox(node.x, node.y, node.width, node.height, node.rotation)
}

// Pairwise edge/center matching intentionally keeps both axes in one pass.
// eslint-disable-next-line complexity
export function computeSnap(
  movingIds: Set<string>,
  movingBounds: Rect,
  allNodes: SceneNode[],
  threshold = DEFAULT_SNAP_THRESHOLD
): SnapResult {
  const targets = allNodes.filter((n) => !movingIds.has(n.id))
  if (targets.length === 0) return { dx: 0, dy: 0, guides: [] }

  const m = {
    left: movingBounds.x,
    right: movingBounds.x + movingBounds.width,
    centerX: movingBounds.x + movingBounds.width / 2,
    top: movingBounds.y,
    bottom: movingBounds.y + movingBounds.height,
    centerY: movingBounds.y + movingBounds.height / 2
  }

  let bestDx = Infinity
  let bestDy = Infinity
  const guides: SnapGuide[] = []

  for (const target of targets) {
    const t = getEdges(target)

    // X-axis snapping: left-to-left, left-to-right, right-to-left, right-to-right, center-to-center
    const xPairs: [number, number][] = [
      [m.left, t.left],
      [m.left, t.right],
      [m.right, t.left],
      [m.right, t.right],
      [m.centerX, t.centerX]
    ]

    for (const [mVal, tVal] of xPairs) {
      const d = tVal - mVal
      if (Math.abs(d) < threshold && Math.abs(d) <= Math.abs(bestDx)) {
        if (Math.abs(d) < Math.abs(bestDx)) {
          bestDx = d
          guides.length = guides.filter((g) => g.axis === 'y').length
            ? guides.length
            : guides.length
          // Remove old x guides if we found a closer snap
          for (let i = guides.length - 1; i >= 0; i--) {
            if (guides[i].axis === 'x') guides.splice(i, 1)
          }
        }
        if (Math.abs(d) === Math.abs(bestDx)) {
          const minY = Math.min(m.top, t.top)
          const maxY = Math.max(m.bottom, t.bottom)
          guides.push({ axis: 'x', position: tVal, from: minY, to: maxY })
        }
      }
    }

    // Y-axis snapping
    const yPairs: [number, number][] = [
      [m.top, t.top],
      [m.top, t.bottom],
      [m.bottom, t.top],
      [m.bottom, t.bottom],
      [m.centerY, t.centerY]
    ]

    for (const [mVal, tVal] of yPairs) {
      const d = tVal - mVal
      if (Math.abs(d) < threshold && Math.abs(d) <= Math.abs(bestDy)) {
        if (Math.abs(d) < Math.abs(bestDy)) {
          for (let i = guides.length - 1; i >= 0; i--) {
            if (guides[i].axis === 'y') guides.splice(i, 1)
          }
          bestDy = d
        }
        if (Math.abs(d) === Math.abs(bestDy)) {
          const minX = Math.min(m.left, t.left)
          const maxX = Math.max(m.right, t.right)
          guides.push({ axis: 'y', position: tVal, from: minX, to: maxX })
        }
      }
    }
  }

  return {
    dx: Math.abs(bestDx) <= threshold ? bestDx : 0,
    dy: Math.abs(bestDy) <= threshold ? bestDy : 0,
    guides
  }
}

export function computeSelectionBounds(nodes: SceneNode[]): Rect | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const edges = getEdges(n)
    minX = Math.min(minX, edges.left)
    minY = Math.min(minY, edges.top)
    maxX = Math.max(maxX, edges.right)
    maxY = Math.max(maxY, edges.bottom)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Gaps this close count as equal, so float noise from world transforms does not hide a match. */
const SPACING_MATCH_TOLERANCE = 0.01

/** A layer's extent along one axis (`start`..`end`) and across it (`crossStart`..`crossEnd`). */
export interface SpacingSpan {
  start: number
  end: number
  crossStart: number
  crossEnd: number
}

/**
 * The layers equal spacing measures against, along each axis and sorted by start. Build them once
 * with {@link spacingTargets} and share them between {@link computeSpacingSnap} and
 * {@link computeSpacingGuides}, so one pointer move sorts the layers once.
 */
export interface SpacingTargets {
  readonly x: readonly SpacingSpan[]
  readonly y: readonly SpacingSpan[]
}

interface SpacingPair {
  before: SpacingSpan
  after: SpacingSpan
  gap: number
}

export interface SpacingSnapResult {
  /** The move that makes a gap along x equal to its neighbours', or `null` when none is near. */
  dx: number | null
  dy: number | null
}

type Edges = Pick<ReturnType<typeof getEdges>, 'left' | 'right' | 'top' | 'bottom'>
type Axis = 'x' | 'y'

function spanOf(edges: Edges, axis: Axis): SpacingSpan {
  return axis === 'x'
    ? { start: edges.left, end: edges.right, crossStart: edges.top, crossEnd: edges.bottom }
    : { start: edges.top, end: edges.bottom, crossStart: edges.left, crossEnd: edges.right }
}

function boundsSpan(bounds: Rect, axis: Axis): SpacingSpan {
  const edges = {
    left: bounds.x,
    right: bounds.x + bounds.width,
    top: bounds.y,
    bottom: bounds.y + bounds.height
  }
  return spanOf(edges, axis)
}

function crossOverlaps(a: SpacingSpan, b: SpacingSpan): boolean {
  return a.crossStart < b.crossEnd && a.crossEnd > b.crossStart
}

/** Every layer except the moving ones, as spans along each axis sorted by start. */
export function spacingTargets(
  movingIds: Set<string>,
  allNodes: readonly SceneNode[]
): SpacingTargets {
  const x: SpacingSpan[] = []
  const y: SpacingSpan[] = []
  for (const node of allNodes) {
    if (movingIds.has(node.id)) continue
    const edges = getEdges(node)
    x.push(spanOf(edges, 'x'))
    y.push(spanOf(edges, 'y'))
  }
  const byStart = (a: SpacingSpan, b: SpacingSpan) => a.start - b.start
  return { x: x.sort(byStart), y: y.sort(byStart) }
}

/** The layers beside the moving one along an axis: those sharing some of its extent across it. */
function rowOf(moving: SpacingSpan, sorted: readonly SpacingSpan[]): SpacingSpan[] {
  return sorted.filter((span) => crossOverlaps(span, moving))
}

/**
 * The gaps between neighbours in a row: stretches along the axis that no layer of the row covers,
 * each between the layer reaching furthest into it and the next layer, when the two share some
 * extent across the axis. A layer over another, such as a label on its button, therefore never
 * makes a gap across the button. A gap the moving layer sits in is not a gap between neighbours, so
 * it is left out. The row is sorted by start, so one sweep finds them all.
 */
function neighbourPairs(row: readonly SpacingSpan[], moving: SpacingSpan): SpacingPair[] {
  const pairs: SpacingPair[] = []
  let frontier: SpacingSpan | null = null
  for (const span of row) {
    if (
      frontier &&
      span.start >= frontier.end &&
      crossOverlaps(span, frontier) &&
      !(moving.start < span.start && moving.end > frontier.end)
    ) {
      pairs.push({ before: frontier, after: span, gap: span.start - frontier.end })
    }
    if (!frontier || span.end > frontier.end) frontier = span
  }
  return pairs
}

/** The nearest layer before the moving one (ending at most `slack` into it), and after it. */
function neighboursOf(
  row: readonly SpacingSpan[],
  moving: SpacingSpan,
  slack: number
): { before: SpacingSpan | null; after: SpacingSpan | null } {
  let before: SpacingSpan | null = null
  let after: SpacingSpan | null = null
  for (const span of row) {
    if (span.start < moving.start && span.end <= moving.start + slack) {
      if (!before || span.end > before.end) before = span
    }
    if (span.end > moving.end && span.start >= moving.end - slack) {
      if (!after || span.start < after.start) after = span
    }
  }
  return { before, after }
}

function spacingDelta(
  moving: SpacingSpan,
  sorted: readonly SpacingSpan[],
  threshold: number
): number | null {
  const row = rowOf(moving, sorted)
  const { before, after } = neighboursOf(row, moving, threshold)
  if (!before && !after) return null
  const size = moving.end - moving.start
  const starts: number[] = []
  if (before && after && after.start - before.end - size >= 0) {
    starts.push((before.end + after.start - size) / 2)
  }
  for (const pair of neighbourPairs(row, moving)) {
    if (before) starts.push(before.end + pair.gap)
    if (after) starts.push(after.start - pair.gap - size)
  }
  let best: number | null = null
  for (const start of starts) {
    const delta = start - moving.start
    if (Math.abs(delta) >= threshold) continue
    if (best === null || Math.abs(delta) < Math.abs(best)) best = delta
  }
  return best
}

/**
 * Figma's equal-spacing snap: on each axis, the move within `threshold` that centres the moving
 * bounds between their two neighbours, or leaves them as far from a neighbour as two other
 * neighbours in the same row are apart. Only layers sharing some extent across the axis count.
 */
export function computeSpacingSnap(
  targets: SpacingTargets,
  movingBounds: Rect,
  threshold = DEFAULT_SNAP_THRESHOLD
): SpacingSnapResult {
  const delta = (axis: Axis) =>
    spacingDelta(boundsSpan(movingBounds, axis), targets[axis], threshold)
  return { dx: delta('x'), dy: delta('y') }
}

function gapGuide(before: SpacingSpan, after: SpacingSpan, axis: Axis): SnapGuide {
  const position =
    (Math.max(before.crossStart, after.crossStart) + Math.min(before.crossEnd, after.crossEnd)) / 2
  return {
    axis: axis === 'x' ? 'y' : 'x',
    position,
    from: before.end,
    to: after.start,
    spacing: true
  }
}

function sameGap(a: number, b: number): boolean {
  return Math.abs(a - b) < SPACING_MATCH_TOLERANCE
}

function axisSpacingGuides(
  movingBounds: Rect,
  sorted: readonly SpacingSpan[],
  axis: Axis
): SnapGuide[] {
  const moving = boundsSpan(movingBounds, axis)
  const row = rowOf(moving, sorted)
  const { before, after } = neighboursOf(row, moving, SPACING_MATCH_TOLERANCE)
  const pairs = neighbourPairs(row, moving)
  const sides: SpacingPair[] = []
  if (before) sides.push({ before, after: moving, gap: moving.start - before.end })
  if (after) sides.push({ before: moving, after, gap: after.start - moving.end })
  const matched = sides.filter(
    (side) =>
      side.gap > SPACING_MATCH_TOLERANCE &&
      (sides.some((other) => other !== side && sameGap(other.gap, side.gap)) ||
        pairs.some((pair) => sameGap(pair.gap, side.gap)))
  )
  const gaps = matched.map((side) => side.gap)
  const shown = [...matched, ...pairs.filter((pair) => gaps.some((gap) => sameGap(pair.gap, gap)))]
  return shown.map((pair) => gapGuide(pair.before, pair.after, axis))
}

/**
 * The equal-spacing indicators for bounds where they are: every gap beside them that equals the gap
 * on their other side or a gap between two neighbours in the same row, and those neighbours' gaps.
 */
export function computeSpacingGuides(targets: SpacingTargets, movingBounds: Rect): SnapGuide[] {
  return [
    ...axisSpacingGuides(movingBounds, targets.x, 'x'),
    ...axisSpacingGuides(movingBounds, targets.y, 'y')
  ]
}
