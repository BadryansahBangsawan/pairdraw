import type { Color } from './primitives'
import type {
  NoiseEffectParams,
  OverflowDirection,
  ScrollBehavior,
  TextureEffectParams
} from './types'

export const BLACK: Color = { r: 0, g: 0, b: 0, a: 1 }
export const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 }
export const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 }
export const DEFAULT_FONT_FAMILY = 'Inter'
export const DEFAULT_STROKE_MITER_LIMIT = 4
export const DEFAULT_STROKE_WEIGHT = 1
/**
 * The hidden page a document keeps the components of libraries it uses on, which it shows
 * instances of but never edits: a component library's definitions, and a `.pen` library's.
 */
export const LIBRARY_DEFINITIONS_PAGE_NAME = 'Pairdraw library definitions'

/** The grain of a noise effect whose values are missing: none of the layer covered. */
export const UNSET_NOISE: Readonly<NoiseEffectParams> = {
  noiseType: 'MONOTONE',
  noiseSize: { x: 1, y: 1 },
  density: 0
}

/** A new noise effect's grain, as Figma's effects panel starts one: black at 25%, fully dense. */
export const DEFAULT_NOISE: Readonly<NoiseEffectParams> = {
  noiseType: 'MONOTONE',
  noiseSize: { x: 0.5, y: 0.5 },
  density: 1
}

/** The colour a new noise effect's grains start in. */
export const DEFAULT_NOISE_COLOR: Readonly<Color> = { r: 0, g: 0, b: 0, a: 0.25 }

/** A new texture effect's grain, as Figma's effects panel starts one, with a radius of 4. */
export const DEFAULT_TEXTURE: Readonly<TextureEffectParams> = {
  noiseSize: { x: 4, y: 4 },
  clipToShape: false
}

/** The grain of a texture effect whose values are missing; its radius of 0 moves nothing. */
export const UNSET_TEXTURE: Readonly<TextureEffectParams> = {
  noiseSize: { x: 1, y: 1 },
  clipToShape: true
}

/** The ways a frame's content may scroll in play, as Figma's `overflowDirection` names them. */
export const OVERFLOW_DIRECTIONS = [
  'NONE',
  'HORIZONTAL',
  'VERTICAL',
  'BOTH'
] as const satisfies readonly OverflowDirection[]

/** How a layer moves while its parent frame scrolls in play, in Figma's names. */
export const SCROLL_BEHAVIORS = ['SCROLLS', 'FIXED', 'STICKY_SCROLLS'] as const satisfies readonly ScrollBehavior[]
