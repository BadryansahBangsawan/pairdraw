import type { Color } from './primitives'

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
