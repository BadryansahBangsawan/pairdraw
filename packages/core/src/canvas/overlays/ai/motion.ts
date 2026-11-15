import {
  AI_ENTER_MAX_DELAY_MS,
  AI_ENTER_STAGGER_MS,
  AI_SHIMMER_BAND,
  AI_SHIMMER_PERIOD_MS
} from '#core/constants'

/**
 * When each of `count` layers starts tracing in, after the first: one stagger apart, closer
 * together once the edit adds so many that the last would start after the cap.
 */
export function entranceDelays(count: number): number[] {
  if (count <= 1) return count === 1 ? [0] : []
  const step = Math.min(AI_ENTER_STAGGER_MS, AI_ENTER_MAX_DELAY_MS / (count - 1))
  return Array.from({ length: count }, (_, index) => index * step)
}

/** How far a layer's entrance has come: its outline traced, the outline's and the wash's alpha. */
export interface EntranceFrame {
  /** Share of the outline drawn, from its top-left corner round. */
  trace: number
  outline: number
  wash: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/** The entrance at `t`, from 0 when the layer's turn comes to 1 when it is done. */
export function entranceFrame(t: number): EntranceFrame {
  const clamped = Math.min(1, Math.max(0, t))
  return {
    trace: easeOutCubic(Math.min(1, clamped / 0.6)),
    // The outline holds while it traces, then fades as the layer settles.
    outline: clamped < 0.7 ? 0.9 : 0.9 * (1 - (clamped - 0.7) / 0.3),
    wash: 0.2 * (1 - easeOutCubic(clamped))
  }
}

/**
 * Where the light's centre is along an area's diagonal of `span` pixels at `now`: it enters
 * before the area's top-left corner and leaves past its bottom-right one each period.
 */
export function shimmerPosition(now: number, span: number): number {
  const phase = (now % AI_SHIMMER_PERIOD_MS) / AI_SHIMMER_PERIOD_MS
  return phase * (span + AI_SHIMMER_BAND * 2) - AI_SHIMMER_BAND
}
