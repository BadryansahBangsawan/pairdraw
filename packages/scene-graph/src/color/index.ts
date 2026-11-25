export * from './contrast'
export * from './management'
export * from './profile'
export { normalizeColor } from './normalize'
export * from './okhcl'
export { colorSchema } from './schema'

import { parse, formatHex, formatHex8, formatRgb, converter, differenceEuclidean } from 'culori'

import { BLACK } from '../constants'
import type { Color } from '../primitives'
import type { DocumentColorSpace } from '../types'
import { fitIntoProfile, SRGB_SYNTAX_MODES } from './management'
import { normalizeColor } from './normalize'
import { colorToProfileCSS } from './profile'

const toRGB = converter('rgb')

/**
 * A CSS color as components in `profile`, or null when `input` is not one. Hex and the other sRGB
 * syntaxes give their numbers as they are, as Figma takes typed or imported hex as the document's
 * own numbers in either profile. A color that names its space, such as `color(display-p3 …)` or
 * `oklch()`, is converted into `profile`, and brought inside it by reducing chroma when the profile
 * cannot show it.
 */
export function tryParseColor(input: string, profile: DocumentColorSpace = 'srgb'): Color | null {
  const parsed = parse(input)
  if (!parsed) return null
  // A component written past the float range, such as `1e999`, is no color.
  if (Object.values(parsed).some((value) => typeof value === 'number' && !Number.isFinite(value)))
    return null
  const a = parsed.alpha ?? 1
  // culori leaves a `none` channel out, which normalizing reads as zero.
  if (SRGB_SYNTAX_MODES.has(parsed.mode)) return normalizeColor({ ...toRGB(parsed), a })
  return fitIntoProfile(parsed, profile).color
}

/** A CSS color as components in `profile`, or black when `input` is not one. */
export function parseColor(input: string, profile: DocumentColorSpace = 'srgb'): Color {
  return tryParseColor(input, profile) ?? { ...BLACK }
}

export function colorToHex(color: Color): string {
  return formatHex({ mode: 'rgb', r: color.r, g: color.g, b: color.b }).toUpperCase()
}

export function colorToHex8(color: Color, alpha?: number): string {
  const a = alpha ?? color.a
  if (a >= 1) return colorToHex(color)
  return formatHex8({ mode: 'rgb', r: color.r, g: color.g, b: color.b, alpha: a }).toUpperCase()
}

export function colorToHexRaw(color: Color): string {
  return colorToHex(color).slice(1)
}

export function colorToRgba255(color: Color) {
  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
    a: color.a
  }
}

export function colorToCSS(color: Color): string {
  return formatRgb({ mode: 'rgb', r: color.r, g: color.g, b: color.b, alpha: color.a })
}

export function colorToCSSCompact(color: Color): string {
  const { r, g, b } = colorToRgba255(color)
  const a = Number(color.a.toFixed(3))
  if (a >= 1) return `rgb(${r},${g},${b})`
  return `rgba(${r},${g},${b},${a})`
}

/**
 * A stored color as CSS in its document's profile: opaque ones as hex and translucent ones as
 * `rgba()`, which Tailwind matches to its palette, or `color(display-p3 …)` in Display P3, where
 * hex has no room for a component past 1. Colors already in the profile are written as stored.
 */
export function colorToDocumentCSS(color: Color, profile: DocumentColorSpace = 'srgb'): string {
  if (profile === 'srgb') return color.a >= 1 ? colorToHex(color) : colorToCSS(color)
  return colorToProfileCSS(color, profile, 'display-p3')
}

/**
 * A stored color as CSS for a preview of it, such as a swatch or a slider thumb: exactly
 * `colorToCSS` in an sRGB document, so nothing a document already showed changes, and in its own
 * profile otherwise, where `rgb()` cannot show a component past 1.
 */
export function colorToPreviewCSS(color: Color, profile: DocumentColorSpace = 'srgb'): string {
  return profile === 'srgb' ? colorToCSS(color) : colorToDocumentCSS(color, profile)
}

export function rgba255ToColor(r: number, g: number, b: number, a = 1): Color {
  return { r: r / 255, g: g / 255, b: b / 255, a }
}

/** A solid paint of `color`, a CSS color read into `profile` or components already in it. */
export function colorToFill(color: string | Color, profile: DocumentColorSpace = 'srgb') {
  const rgba = typeof color === 'string' ? parseColor(color, profile) : color
  return {
    type: 'SOLID' as const,
    color: { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a },
    opacity: rgba.a,
    visible: true
  }
}

const euclideanRGB255 = differenceEuclidean('rgb')

export function colorDistance(c1: Color, c2: Color): number {
  return (
    euclideanRGB255(
      { mode: 'rgb', r: c1.r, g: c1.g, b: c1.b },
      { mode: 'rgb', r: c2.r, g: c2.g, b: c2.b }
    ) * 255
  )
}
export * from './schema'
