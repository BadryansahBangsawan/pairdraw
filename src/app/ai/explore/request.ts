/** What variants explore: their structure, or their look. */
export const EXPLORE_AXES = ['layout', 'style'] as const
export type ExploreAxis = (typeof EXPLORE_AXES)[number]

export const MIN_VARIANTS = 2
export const MAX_VARIANTS = 6
export const DEFAULT_VARIANTS = 3

/**
 * "Let it cook": `off` sends messages as they are; `variants` asks for several designs side by
 * side, each a new top-level frame; `single` ("Don't iterate") asks for one design in one pass.
 */
export const EXPLORE_MODES = ['off', 'variants', 'single'] as const
export type ExploreMode = (typeof EXPLORE_MODES)[number]

/** The composer's choice, which keeps the count and axis while the mode is off. */
export interface ExploreSetting {
  mode: ExploreMode
  count: number
  axis: ExploreAxis
}

/** What a message asks the model for, beyond its text. */
export type ExploreRequest =
  | { kind: 'variants'; count: number; axis: ExploreAxis }
  | { kind: 'single' }

export const DEFAULT_EXPLORE_SETTING: ExploreSetting = {
  mode: 'off',
  count: DEFAULT_VARIANTS,
  axis: 'layout'
}

export function clampVariantCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_VARIANTS
  return Math.min(MAX_VARIANTS, Math.max(MIN_VARIANTS, Math.round(count)))
}

/** The request a setting makes of the next message, or null when exploring is off. */
export function exploreRequestOf(setting: ExploreSetting): ExploreRequest | null {
  if (setting.mode === 'off') return null
  if (setting.mode === 'single') return { kind: 'single' }
  return { kind: 'variants', count: clampVariantCount(setting.count), axis: setting.axis }
}

export function isExploreMode(value: string): value is ExploreMode {
  return EXPLORE_MODES.some((mode) => mode === value)
}

export function isExploreAxis(value: string): value is ExploreAxis {
  return EXPLORE_AXES.some((axis) => axis === value)
}
