/**
 * The curated visual directions `get_style` serves, by id. Each one is Pairdraw's own: tokens
 * here and its written direction in `guides/<id>.md`.
 */
export const STYLE_ARCHETYPE_IDS = [
  'swiss-grid',
  'editorial-serif',
  'scholarly',
  'poster-bold',
  'luxury-noir',
  'architectural-mono',
  'soft-minimal',
  'enterprise-trust',
  'analytics-console',
  'bento-showcase',
  'nordic-light',
  'wellness-calm',
  'fintech-night',
  'neo-brutalist',
  'playful-pop',
  'frosted-aurora',
  'neon-night',
  'risograph-print',
  'sketchbook',
  'terminal',
  'warm-organic'
] as const

export type StyleArchetypeId = (typeof STYLE_ARCHETYPE_IDS)[number]

/** A font face as the text tools name it: a family the web font services carry and a style. */
export interface StyleFont {
  family: string
  style: string
}

/** The colors of a direction by role, as hex. Text roles meet WCAG AA on what they sit on. */
export interface StylePalette {
  /** The page or canvas behind everything. */
  background: string
  /** Cards, panels, and inputs that sit on the background. */
  surface: string
  text: string
  /** Secondary text, captions, and placeholders; readable on background and surface. */
  mutedText: string
  /** Dividers and outlines. */
  border: string
  /** Primary actions, links, and the one color that leads. */
  accent: string
  /** Text and icons placed on the accent. */
  onAccent: string
  /** A second color for tags, highlights, charts, and illustration. */
  highlight: string
}

/**
 * The elevation a direction gives raised layers, as `set_effects` takes it; null where it keeps
 * layers flat.
 */
export interface StyleElevation {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'BACKGROUND_BLUR'
  /** Hex, with alpha as `#RRGGBBAA`; blurs have none. */
  color?: string
  offset_x: number
  offset_y: number
  radius: number
  spread: number
}

export interface StyleArchetype {
  id: StyleArchetypeId
  name: string
  /** One sentence on what it looks and feels like. */
  summary: string
  /** Words a request is matched against: moods, eras, and techniques. */
  tags: readonly string[]
  /** Kinds of product, page, or brand it suits. */
  bestFor: readonly string[]
  appearance: 'light' | 'dark'
  fonts: { heading: StyleFont; body: StyleFont; mono?: StyleFont }
  /** Font sizes in pixels, smallest first: caption, body, and up to the display size. */
  typeScale: readonly number[]
  palette: StylePalette
  /** Corner radii in pixels for small controls, cards, and large panels. */
  radius: { small: number; medium: number; large: number }
  /** The base spacing step and the gap between page sections, in pixels. */
  spacing: { unit: number; section: number }
  /** The weight of borders and dividers. */
  strokeWeight: number
  elevation: StyleElevation | null
}
