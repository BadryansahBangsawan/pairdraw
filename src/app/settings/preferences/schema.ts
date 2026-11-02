import * as v from 'valibot'

/** How far the arrow keys may move layers, from a fine step to the farthest a preference sets. */
export const NUDGE_DISTANCE_MIN = 0.1
export const NUDGE_DISTANCE_MAX = 1000

/** One nudge distance, in pixels. */
export const nudgeDistanceSchema = v.pipe(
  v.number(),
  v.finite(),
  v.minValue(NUDGE_DISTANCE_MIN),
  v.maxValue(NUDGE_DISTANCE_MAX)
)
