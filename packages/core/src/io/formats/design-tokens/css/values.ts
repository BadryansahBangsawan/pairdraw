import { converter, formatHex, formatHex8 } from 'culori'

import { cssTokenProperty, cssValueTokens } from '@pairdraw/dom-css/export'
import type { TokenUnit } from '@pairdraw/scene-graph'
import { colorToCSS, parseDisplayableColor } from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { tokenNumberFromUnit, tokenNumberInUnit } from '@pairdraw/scene-graph/variables'

/** How a stylesheet writes a color, so a value written back keeps its notation. */
export type ColorNotation =
  | 'hex'
  | 'rgb'
  | 'hsl'
  /** `220 14% 96%`: HSL channels for `hsl(var(--x))`, as shadcn/ui themes wrote them. */
  | 'hsl-channels'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'other'

/** A custom property's value as a token reads it. Numbers are stored as variables hold them. */
export type CSSTokenValue =
  | { kind: 'color'; color: Color; notation: ColorNotation }
  | { kind: 'number'; value: number; unit: TokenUnit }
  | { kind: 'string'; value: string }
  | { kind: 'font'; family: string }
  | { kind: 'reference'; name: string }
  /** A number only a CSS engine computes, `clamp(1rem, 4vw, 1.5rem)`; `unit` when it says one. */
  | { kind: 'expression'; css: string; unit: TokenUnit | undefined }
  | { kind: 'other'; css: string }

const NUMBER = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i
const HSL_CHANNELS = /^([+-]?[\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?$/i
const COLOR_FUNCTIONS: Record<string, ColorNotation> = {
  rgb: 'rgb',
  rgba: 'rgb',
  hsl: 'hsl',
  hsla: 'hsl',
  hwb: 'hwb',
  lab: 'lab',
  lch: 'lch',
  oklab: 'oklab',
  oklch: 'oklch'
}
const LITERAL_UNITS: Partial<Record<string, TokenUnit>> = {
  '': 'none',
  px: 'px',
  rem: 'rem',
  '%': '%',
  ms: 'ms',
  s: 's',
  deg: 'deg'
}
const ANGLE_UNITS = new Set(['rad', 'grad', 'turn'])
/** Functions whose result is a number a variable can hold once a CSS engine computes it. */
const NUMERIC_FUNCTIONS = new Set(['calc', 'clamp', 'min', 'max', 'round', 'abs', 'var'])

function notationOf(css: string): ColorNotation {
  if (css.startsWith('#')) return 'hex'
  const name = /^([a-z-]+)\(/i.exec(css)?.[1]?.toLowerCase()
  return (name && COLOR_FUNCTIONS[name]) || 'other'
}

/** `16px`, `1.5rem`, `150ms`, `0.5`: the stored number and its unit, or a unit only CSS computes. */
function readNumber(css: string): CSSTokenValue | undefined {
  const match = NUMBER.exec(css)
  if (!match) return undefined
  const number = Number(match[1])
  if (!Number.isFinite(number)) return undefined
  const written = match[2].toLowerCase()
  const unit = LITERAL_UNITS[written]
  if (unit) return { kind: 'number', value: tokenNumberFromUnit(number, unit), unit }
  return { kind: 'expression', css, unit: ANGLE_UNITS.has(written) ? 'deg' : 'px' }
}

/** The unit a CSS expression's own numbers are written in, if any. */
function expressionUnit(css: string): TokenUnit | undefined {
  let other = false
  for (const token of cssValueTokens(css)) {
    if (token.kind !== 'number') continue
    const unit = NUMBER.exec(token.text)?.[2].toLowerCase() ?? ''
    if (!unit) continue
    const literal = LITERAL_UNITS[unit]
    if (literal) return literal
    other = true
  }
  return other ? 'px' : undefined
}

function readExpression(css: string): CSSTokenValue | undefined {
  const tokens = cssValueTokens(css)
  const first = tokens.at(0)
  if (first?.kind !== 'function' || !NUMERIC_FUNCTIONS.has(first.text.toLowerCase())) {
    return undefined
  }
  const last = tokens.at(-1)
  // One function call and nothing after it: `calc(…)`, not `calc(…) solid red`.
  if (last?.kind !== 'paren' || last.to !== css.length) return undefined
  return { kind: 'expression', css, unit: expressionUnit(css) }
}

function unquote(css: string): string | undefined {
  const match = /^(["'])([\s\S]*)\1$/.exec(css)
  if (!match) return undefined
  return match[2].replaceAll(/\\a\s?/gi, '\n').replaceAll(/\\([\s\S])/g, '$1')
}

/** The first family of a `font-family` list, unquoted. */
function firstFamily(css: string): string | undefined {
  const [first = ''] = css.split(',')
  const family = (unquote(first.trim()) ?? first).trim()
  return family || undefined
}

/**
 * A custom property's value as a token: a color, a number in a token unit, a quoted string, a
 * font family where the property names fonts, a `var()` reference, a numeric expression, or
 * something no variable holds, such as a shadow.
 */
export function readCSSTokenValue(css: string, { font = false } = {}): CSSTokenValue {
  const value = css.trim()
  const tokens = cssValueTokens(value)
  const [only] = tokens
  if (tokens.length === 1 && only.kind === 'reference') {
    const name = cssTokenProperty(only)
    if (name) return { kind: 'reference', name: name.slice(2) }
  }
  const number = readNumber(value)
  if (number) return number
  const channels = HSL_CHANNELS.exec(value)
  if (channels) {
    const [, hue, saturation, lightness, alpha] = channels
    const color = parseDisplayableColor(
      `hsl(${hue} ${saturation}% ${lightness}%${alpha ? ` / ${alpha}` : ''})`
    )
    if (color) return { kind: 'color', color, notation: 'hsl-channels' }
  }
  const color = parseDisplayableColor(value)
  if (color) return { kind: 'color', color, notation: notationOf(value) }
  const expression = readExpression(value)
  if (expression) return expression
  if (font) {
    const family = firstFamily(value)
    if (family) return { kind: 'font', family }
  }
  const string = unquote(value)
  if (string !== undefined) return { kind: 'string', value: string }
  return { kind: 'other', css: value }
}

/** Whether a custom property names fonts: `--font-sans`, `--font-family-body`, `--heading-font`. */
export function namesFont(name: string): boolean {
  return name === 'font' || name.startsWith('font-') || name.endsWith('-font')
}

/** Color channels are stored as floats; this absorbs rounding through other color spaces. */
const CHANNEL_TOLERANCE = 1 / 512

function sameColor(a: Color, b: Color): boolean {
  return (['r', 'g', 'b', 'a'] as const).every(
    (channel) => Math.abs(a[channel] - b[channel]) <= CHANNEL_TOLERANCE
  )
}

const LENGTH_UNITS = new Set<TokenUnit>(['px', 'rem'])

function sameUnitKind(a: TokenUnit, b: TokenUnit): boolean {
  return a === b || (LENGTH_UNITS.has(a) && LENGTH_UNITS.has(b))
}

function collapse(css: string): string {
  return css.replaceAll(/\s+/g, ' ').trim()
}

/**
 * Whether two values mean the same token value, however each is written: `16px` and `1rem`,
 * `#fff` and `oklch(1 0 0)`, or two font lists that start with the same family.
 */
export function sameCSSTokenValue(a: CSSTokenValue, b: CSSTokenValue): boolean {
  if (a.kind === 'color' && b.kind === 'color') return sameColor(a.color, b.color)
  if (a.kind === 'number' && b.kind === 'number')
    return sameUnitKind(a.unit, b.unit) && Math.abs(a.value - b.value) < 1e-6
  if (a.kind === 'string' && b.kind === 'string') return a.value === b.value
  if (a.kind === 'font' && b.kind === 'font') return a.family === b.family
  if (a.kind === 'font' && b.kind === 'string') return a.family === b.value
  if (a.kind === 'string' && b.kind === 'font') return a.value === b.family
  if (a.kind === 'reference' && b.kind === 'reference') return a.name === b.name
  if (
    (a.kind === 'expression' || a.kind === 'other') &&
    (b.kind === 'expression' || b.kind === 'other')
  )
    return collapse(a.css) === collapse(b.css)
  return false
}

function round(value: number | undefined, digits: number): number {
  return Number((value ?? 0).toFixed(digits))
}

function alphaSuffix(alpha: number): string {
  return alpha < 1 ? ` / ${round(alpha, 3)}` : ''
}

const toHSL = converter('hsl')
const toHWB = converter('hwb')
const toLab = converter('lab')
const toLCH = converter('lch')
const toOklab = converter('oklab')
const toOklch = converter('oklch')

/** A color written in a notation: `oklch(0.7 0.19 41)`, `#ff5b2e`, `16 100% 59%`. */
export function formatCSSColor(color: Color, notation: ColorNotation): string {
  const rgb = { mode: 'rgb' as const, r: color.r, g: color.g, b: color.b, alpha: color.a }
  const a = alphaSuffix(color.a)
  switch (notation) {
    case 'rgb':
      return colorToCSS(color)
    case 'hsl':
    case 'hsl-channels': {
      const { h, s, l } = toHSL(rgb)
      const channels = `${round(h, 1)} ${round(s * 100, 1)}% ${round(l * 100, 1)}%`
      return notation === 'hsl' ? `hsl(${channels}${a})` : `${channels}${a}`
    }
    case 'hwb': {
      const { h, w, b } = toHWB(rgb)
      return `hwb(${round(h, 1)} ${round(w * 100, 1)}% ${round(b * 100, 1)}%${a})`
    }
    case 'lab': {
      const { l, a: x, b } = toLab(rgb)
      return `lab(${round(l, 2)} ${round(x, 2)} ${round(b, 2)}${a})`
    }
    case 'lch': {
      const { l, c, h } = toLCH(rgb)
      return `lch(${round(l, 2)} ${round(c, 2)} ${round(h, 2)}${a})`
    }
    case 'oklab': {
      const { l, a: x, b } = toOklab(rgb)
      return `oklab(${round(l, 4)} ${round(x, 4)} ${round(b, 4)}${a})`
    }
    case 'oklch': {
      const { l, c, h } = toOklch(rgb)
      return `oklch(${round(l, 4)} ${round(c, 4)} ${round(h, 2)}${a})`
    }
    default:
      return color.a < 1 ? formatHex8(rgb) : formatHex(rgb)
  }
}

/**
 * `next` written as `previous` writes its kind of value: a color in the same notation, a length
 * in `rem` where it was in `rem`. Anything else is written as `nextCSS` has it.
 */
export function rewriteCSSTokenValue(
  previous: CSSTokenValue,
  next: CSSTokenValue,
  nextCSS: string
): string {
  if (previous.kind === 'color' && next.kind === 'color' && previous.notation !== 'other')
    return formatCSSColor(next.color, previous.notation)
  if (
    previous.kind === 'number' &&
    next.kind === 'number' &&
    previous.unit === 'rem' &&
    next.unit === 'px'
  )
    return `${Number(tokenNumberInUnit(next.value, 'rem').toFixed(6))}rem`
  return nextCSS
}
