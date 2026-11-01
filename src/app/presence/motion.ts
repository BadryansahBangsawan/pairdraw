import type { Vector } from '@pairdraw/scene-graph/primitives'

/** How long a cursor takes to glide to where its owner last moved it. */
export const CURSOR_GLIDE_MS = 180
/**
 * Updates closer together than this are one stream, as when an agent writes a design: the cursor
 * then moves at an even pace over each gap instead of settling and starting again.
 */
export const CURSOR_STREAM_GAP_MS = 400
/** The shortest step of a streamed glide, so updates that bunch up still read as motion. */
const MIN_STREAM_STEP_MS = 60
/** How long the view takes to pan to where the followed person or agent went. */
export const FOLLOW_GLIDE_MS = 260

/** A move from one point to another that started at `start` and lasts `duration` ms. */
export interface Glide {
  from: Vector
  to: Vector
  start: number
  duration: number
  /** Moves at an even pace, for a cursor that keeps receiving updates; otherwise it eases out. */
  steady?: boolean
}

/** Fast start, gentle stop, so a cursor catches up quickly and settles without overshooting. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - (1 - clamped) ** 3
}

/** Where a glide is at `now`, and whether it has arrived. */
export function glideAt(glide: Glide, now: number): { point: Vector; done: boolean } {
  const t = glide.duration > 0 ? (now - glide.start) / glide.duration : 1
  const k = glide.steady ? Math.min(1, Math.max(0, t)) : easeOutCubic(t)
  return {
    point: {
      x: glide.from.x + (glide.to.x - glide.from.x) * k,
      y: glide.from.y + (glide.to.y - glide.from.y) * k
    },
    done: t >= 1
  }
}

/**
 * A glide to `to` that starts wherever the previous one is now, so frequent updates never make a
 * cursor jump back. Without a previous glide the point simply appears at `to`. An update that
 * follows the last within `CURSOR_STREAM_GAP_MS` glides steadily for as long as that gap, so the
 * cursor is still moving when the next one arrives; a lone update eases out over `duration`.
 */
export function retarget(
  previous: Glide | undefined,
  to: Vector,
  now: number,
  duration: number
): Glide {
  if (!previous) return { from: to, to, start: now, duration: 0 }
  if (previous.to.x === to.x && previous.to.y === to.y) return previous
  const from = glideAt(previous, now).point
  const gap = now - previous.start
  if (gap < CURSOR_STREAM_GAP_MS)
    return { from, to, start: now, duration: Math.max(MIN_STREAM_STEP_MS, gap), steady: true }
  return { from, to, start: now, duration }
}
