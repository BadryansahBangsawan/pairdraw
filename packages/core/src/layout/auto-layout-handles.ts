import type { SceneNode } from '@pairdraw/scene-graph'
import { isGeneratedFrame } from '@pairdraw/scene-graph/generated'

/** The side of a frame a padding handle edits. */
export type AutoLayoutPaddingSide = 'top' | 'right' | 'bottom' | 'left'

/** A rectangle in the frame's own coordinates, the space a handle occupies. */
export interface AutoLayoutHandleRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AutoLayoutPaddingHandle {
  kind: 'padding'
  side: AutoLayoutPaddingSide
  rect: AutoLayoutHandleRect
  value: number
}

export interface AutoLayoutGapHandle {
  kind: 'gap'
  /** The gap the flow lays out, or the gap between wrapped lines. */
  axis: 'primary' | 'counter'
  /** The child the gap starts after, on the primary axis. */
  index: number
  rect: AutoLayoutHandleRect
  value: number
}

export type AutoLayoutHandle = AutoLayoutPaddingHandle | AutoLayoutGapHandle
export type AutoLayoutHandleHit =
  | Pick<AutoLayoutPaddingHandle, 'kind' | 'side'>
  | Pick<AutoLayoutGapHandle, 'kind' | 'axis' | 'index'>

export interface AutoLayoutHandleLayout {
  nodeId: string
  layoutMode: 'HORIZONTAL' | 'VERTICAL'
  /** False where no edit can land, such as a generated frame's own layout. */
  editable: boolean
  padding: AutoLayoutPaddingHandle[]
  gaps: AutoLayoutGapHandle[]
}

export interface AutoLayoutDragInput {
  /** Pointer movement on screen, in pixels. */
  dx: number
  dy: number
  zoom: number
  /** Alt edits the opposite side on the dragged axis; with Shift, every side. */
  alt: boolean
  /** Shift moves padding or spacing by the large nudge. */
  shift: boolean
  /** The large nudge distance, as Settings → Editor sets it. */
  bigNudge?: number
}

export interface AutoLayoutDragChanges {
  /** The new value of the dragged property, clamped to zero. */
  value: number
  changes: Partial<
    Pick<
      SceneNode,
      | 'paddingTop'
      | 'paddingRight'
      | 'paddingBottom'
      | 'paddingLeft'
      | 'itemSpacing'
      | 'counterAxisSpacing'
    >
  >
}

/** The gap between two neighbouring children, in the frame's coordinates. */
function primaryGapRects(
  node: SceneNode,
  children: readonly SceneNode[]
): Array<{ index: number; rect: AutoLayoutHandleRect }> {
  if (children.length < 2 || node.itemSpacing <= 0 || node.primaryAxisAlign === 'SPACE_BETWEEN')
    return []
  const isRow = node.layoutMode === 'HORIZONTAL'
  const rects: Array<{ index: number; rect: AutoLayoutHandleRect }> = []
  for (let index = 0; index < children.length - 1; index++) {
    const prev = children[index]
    const next = children[index + 1]
    const prevStart = isRow ? prev.x : prev.y
    const prevEnd = isRow ? prev.x + prev.width : prev.y + prev.height
    const nextStart = isRow ? next.x : next.y
    const nextEnd = isRow ? next.x + next.width : next.y + next.height
    // A reversed flow (RTL rows, for one) lays the next child before the previous one.
    const start = nextStart >= prevStart ? prevEnd : nextEnd
    const end = nextStart >= prevStart ? nextStart : prevStart
    if (end <= start) continue
    rects.push(
      isRow
        ? {
            index,
            rect: {
              x: start,
              y: node.paddingTop,
              width: end - start,
              height: node.height - node.paddingTop - node.paddingBottom
            }
          }
        : {
            index,
            rect: {
              x: node.paddingLeft,
              y: start,
              width: node.width - node.paddingLeft - node.paddingRight,
              height: end - start
            }
          }
    )
  }
  return rects
}

/**
 * The gap between wrapped lines, which a wrapping flow lays out with counterAxisSpacing. Lines are
 * grouped by their position so a line with different item sizes still yields one gap.
 */
function counterGapRects(
  node: SceneNode,
  children: readonly SceneNode[]
): Array<{ index: number; rect: AutoLayoutHandleRect }> {
  if (node.layoutWrap !== 'WRAP' || node.counterAxisSpacing <= 0 || children.length < 2) return []
  const isRow = node.layoutMode === 'HORIZONTAL'
  const lines: Array<{ start: number; end: number }> = []
  for (const child of children) {
    const start = isRow ? child.y : child.x
    const end = isRow ? child.y + child.height : child.x + child.width
    // A centered or baseline line aligns children with different sizes at different starts.
    const line = lines.find((candidate) => start <= candidate.end && end >= candidate.start)
    if (line) {
      line.start = Math.min(line.start, start)
      line.end = Math.max(line.end, end)
    } else {
      lines.push({ start, end })
    }
  }
  const sorted = lines.sort((left, right) => left.start - right.start)
  const rects: Array<{ index: number; rect: AutoLayoutHandleRect }> = []
  for (let index = 0; index < sorted.length - 1; index++) {
    const previous = sorted[index]
    const next = sorted[index + 1]
    if (next.start <= previous.end) continue
    rects.push(
      isRow
        ? {
            index,
            rect: {
              x: node.paddingLeft,
              y: previous.end,
              width: node.width - node.paddingLeft - node.paddingRight,
              height: next.start - previous.end
            }
          }
        : {
            index,
            rect: {
              x: previous.end,
              y: node.paddingTop,
              width: next.start - previous.end,
              height: node.height - node.paddingTop - node.paddingBottom
            }
          }
    )
  }
  return rects
}

/** The padding and gap zones of an auto-layout frame, in its own coordinates. */
const PADDING_FIELD = {
  top: 'paddingTop',
  right: 'paddingRight',
  bottom: 'paddingBottom',
  left: 'paddingLeft'
} as const

function paddingValue(node: SceneNode, side: AutoLayoutPaddingSide): number {
  return node[PADDING_FIELD[side]]
}

/** The band a padding side occupies, in the frame's coordinates. */
function paddingBand(
  node: SceneNode,
  side: AutoLayoutPaddingSide,
  value: number
): AutoLayoutHandleRect {
  switch (side) {
    case 'top':
      return { x: 0, y: 0, width: node.width, height: value }
    case 'right':
      return { x: node.width - value, y: 0, width: value, height: node.height }
    case 'bottom':
      return { x: 0, y: node.height - value, width: node.width, height: value }
    case 'left':
      return { x: 0, y: 0, width: value, height: node.height }
    default:
      throw new Error('Unknown padding side')
  }
}

/** The frame edge a padding handle hugs, so the nearest of two meeting bands wins. */
function edgeDistance(handle: AutoLayoutPaddingHandle, x: number, y: number): number {
  switch (handle.side) {
    case 'top':
      return y
    case 'bottom':
      return handle.rect.y + handle.rect.height - y
    case 'left':
      return x
    case 'right':
      return handle.rect.x + handle.rect.width - x
    default:
      throw new Error('Unknown padding side')
  }
}

export function measureAutoLayoutHandles(
  node: SceneNode | undefined,
  children: readonly SceneNode[]
): AutoLayoutHandleLayout | null {
  if (!node || (node.layoutMode !== 'HORIZONTAL' && node.layoutMode !== 'VERTICAL')) return null
  const laidOut = children.filter(
    (child) => child.visible && child.layoutPositioning !== 'ABSOLUTE'
  )
  const padding: AutoLayoutPaddingHandle[] = []
  const sides: AutoLayoutPaddingSide[] = ['top', 'right', 'bottom', 'left']
  for (const side of sides) {
    const value = paddingValue(node, side)
    if (value <= 0) continue
    padding.push({ kind: 'padding', side, rect: paddingBand(node, side, value), value })
  }
  const gaps: AutoLayoutGapHandle[] = [
    ...primaryGapRects(node, laidOut).map(({ index, rect }) => ({
      kind: 'gap' as const,
      axis: 'primary' as const,
      index,
      rect,
      value: node.itemSpacing
    })),
    ...counterGapRects(node, laidOut).map(({ index, rect }) => ({
      kind: 'gap' as const,
      axis: 'counter' as const,
      index,
      rect,
      value: node.counterAxisSpacing
    }))
  ]
  return {
    nodeId: node.id,
    layoutMode: node.layoutMode,
    editable: !isGeneratedFrame(node),
    padding,
    gaps
  }
}

function contains(rect: AutoLayoutHandleRect, x: number, y: number, grow = 0): boolean {
  return (
    x >= rect.x - grow &&
    x <= rect.x + rect.width + grow &&
    y >= rect.y - grow &&
    y <= rect.y + rect.height + grow
  )
}

/**
 * The padding or gap handle under a point in the frame's coordinates. Padding wins where it meets a
 * gap, and the nearest frame edge wins in a corner where two padding bands meet.
 */
export function hitAutoLayoutHandle(
  layout: AutoLayoutHandleLayout | null,
  x: number,
  y: number
): AutoLayoutHandleHit | null {
  if (!layout) return null
  let nearest: AutoLayoutPaddingHandle | null = null
  for (const handle of layout.padding) {
    if (!contains(handle.rect, x, y)) continue
    if (!nearest || edgeDistance(handle, x, y) <= edgeDistance(nearest, x, y)) nearest = handle
  }
  if (nearest) return { kind: 'padding', side: nearest.side }
  for (const handle of layout.gaps) {
    if (contains(handle.rect, x, y)) {
      return { kind: 'gap', axis: handle.axis, index: handle.index }
    }
  }
  return null
}

function handleFor(
  layout: AutoLayoutHandleLayout,
  hit: AutoLayoutHandleHit
): AutoLayoutHandle | null {
  if (hit.kind === 'padding') {
    return layout.padding.find((handle) => handle.side === hit.side) ?? null
  }
  return (
    layout.gaps.find((handle) => handle.axis === hit.axis && handle.index === hit.index) ?? null
  )
}

/** Movement along the axis a padding side grows in. */
function paddingDelta(side: AutoLayoutPaddingSide, dx: number, dy: number): number {
  switch (side) {
    case 'top':
      return dy
    case 'bottom':
      return -dy
    case 'left':
      return dx
    case 'right':
      return -dx
    default:
      throw new Error('Unknown padding side')
  }
}

/** Movement across the gaps of a flow: primary along it, counter across it. */
function gapDelta(
  layoutMode: 'HORIZONTAL' | 'VERTICAL',
  axis: AutoLayoutGapHandle['axis'],
  dx: number,
  dy: number
): number {
  const horizontal = layoutMode === 'HORIZONTAL'
  if (axis === 'counter') return horizontal ? dy : dx
  return horizontal ? dx : dy
}

/** The rounded, non-negative value a drag would set for the grabbed handle. */
export function autoLayoutDragValue(
  layout: AutoLayoutHandleLayout,
  hit: AutoLayoutHandleHit,
  input: AutoLayoutDragInput
): number {
  const handle = handleFor(layout, hit)
  if (!handle) return 0
  const zoom = input.zoom > 0 ? input.zoom : 1
  const delta =
    handle.kind === 'padding'
      ? paddingDelta(handle.side, input.dx, input.dy)
      : gapDelta(layout.layoutMode, handle.axis, input.dx, input.dy)
  const raw = handle.value + delta / zoom
  // Shift moves padding and spacing by the large nudge, as Settings → Editor sets it.
  const step = input.bigNudge && input.bigNudge > 0 ? input.bigNudge : 10
  return Math.max(0, input.shift ? Math.round(raw / step) * step : Math.round(raw))
}

/** The properties a drag writes for the grabbed handle, with Alt and Shift expanding padding. */
export function autoLayoutDragChanges(
  layout: AutoLayoutHandleLayout,
  hit: AutoLayoutHandleHit,
  input: AutoLayoutDragInput
): AutoLayoutDragChanges {
  const value = autoLayoutDragValue(layout, hit, input)
  if (hit.kind === 'padding') {
    if (input.alt && input.shift) {
      return {
        value,
        changes: {
          paddingTop: value,
          paddingRight: value,
          paddingBottom: value,
          paddingLeft: value
        }
      }
    }
    if (input.alt) {
      switch (hit.side) {
        case 'top':
        case 'bottom':
          return { value, changes: { paddingTop: value, paddingBottom: value } }
        case 'left':
        case 'right':
          return { value, changes: { paddingLeft: value, paddingRight: value } }
      }
    }
    switch (hit.side) {
      case 'top':
        return { value, changes: { paddingTop: value } }
      case 'right':
        return { value, changes: { paddingRight: value } }
      case 'bottom':
        return { value, changes: { paddingBottom: value } }
      case 'left':
        return { value, changes: { paddingLeft: value } }
    }
  }
  if (hit.axis === 'counter') return { value, changes: { counterAxisSpacing: value } }
  return { value, changes: { itemSpacing: value } }
}
