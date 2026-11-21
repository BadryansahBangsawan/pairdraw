/** The features the landing's tab list switches between, in order. */
export const FEATURE_TABS = ['ai', 'browser', 'controls', 'prototypes', 'layout'] as const

export type FeatureTab = (typeof FEATURE_TABS)[number]
