import { maxBy } from 'es-toolkit'

import type { SelectionTheme } from '@pairdraw/core/canvas'
import { SELECTION_COLOR } from '@pairdraw/core/constants'
import {
  colorToHex,
  compositeOver,
  contrastRatio,
  okhclToRGBA,
  parseColor,
  rgbaToOkHCL
} from '@pairdraw/scene-graph/color'
import { WHITE } from '@pairdraw/scene-graph/constants'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { AccentPreference, AccentPreset } from './schema'

export const DEFAULT_ACCENT: Readonly<AccentPreference> = { kind: 'preset', preset: 'pairdraw' }

/**
 * Base colors of the presets. Pairdraw's brand orange takes dark ink text; the others are dark
 * enough that white text reads on every accent surface in both themes.
 */
export const ACCENT_PRESET_COLORS: Readonly<Record<AccentPreset, string>> = {
  pairdraw: '#FF5B2E',
  blue: '#2563EB',
  purple: '#9333EA',
  pink: '#BE185D',
  red: '#B91C1C',
  orange: '#C2410C',
  yellow: '#A16207',
  green: '#15803D',
  graphite: '#52525B'
}

/** Presets whose canvas selection is their brand color as it is, rather than one derived from it. */
const ACCENT_PRESET_SELECTIONS: Readonly<Partial<Record<AccentPreset, string>>> = {
  pairdraw: '#FF5B2E'
}

export type AccentTheme = 'dark' | 'light'

/** The interface tokens an accent recolors, by CSS custom property. */
export const ACCENT_TOKENS = [
  '--color-accent',
  '--color-panel-focus',
  '--color-panel-selected',
  '--color-panel-selected-muted',
  '--color-primary',
  '--color-on-accent',
  '--color-on-primary'
] as const
export type AccentToken = (typeof ACCENT_TOKENS)[number]

type RelatedToken = Exclude<
  AccentToken,
  '--color-on-accent' | '--color-on-primary' | '--color-panel-selected-muted'
>

/**
 * The blue family the derivation is calibrated on. Every other accent keeps each token's
 * lightness, chroma and hue relation to the base, so a new accent looks like this one.
 */
const REFERENCE_BASE = parseColor(ACCENT_PRESET_COLORS.blue)
const REFERENCE_TOKENS: Readonly<Record<AccentTheme, Readonly<Record<RelatedToken, string>>>> = {
  dark: {
    '--color-accent': '#2563EB',
    '--color-panel-focus': '#3B82F6',
    '--color-panel-selected': '#2F6FDD',
    '--color-primary': '#60A5FA'
  },
  light: {
    '--color-accent': '#2563EB',
    '--color-panel-focus': '#2563EB',
    '--color-panel-selected': '#2563EB',
    '--color-primary': '#1D4ED8'
  }
}

/**
 * Each theme's panel surfaces in `src/theme/tokens.css` (`--color-panel`, `--color-panel-secondary`,
 * `--color-panel-field`), which primary text reads on. The selection tint mixes over the first.
 */
export const ACCENT_PANEL_COLORS: Readonly<Record<AccentTheme, readonly [string, ...string[]]>> = {
  dark: ['#1C1C1F', '#19191C', '#26262A'],
  light: ['#FFFFFF', '#FAFAF9', '#F4F4F2']
}

/** How much of the accent the unfocused selection tint mixes over the panel. */
export const ACCENT_TINT_AMOUNT = 0.12

/** Lightness band a base is held in, so a near-black or near-white pick still shows its controls. */
export const ACCENT_LIGHTNESS_RANGE = { min: 0.4, max: 0.75 } as const

/** WCAG AA contrast for normal text, which every accent's text keeps against its surface. */
export const ACCENT_TEXT_CONTRAST = 4.5

/** Lightness steps tried, nearest first, when a color's text would fall short of that contrast. */
const LIGHTNESS_SHIFTS = Array.from({ length: 61 }, (_, index) =>
  index % 2 === 0 ? index / 2 / 200 : -(index + 1) / 2 / 200
)

/** Lightness step and limit for moving primary text away from the panels it sits on. */
const PRIMARY_LIGHTNESS_STEP = 1 / 200
const PRIMARY_LIGHTNESS_STEPS = 200

/** The interface's dark text, `--color-inverted` in the dark theme and `--color-surface` in light. */
const INK = parseColor('#17171C')

export interface AccentPalette {
  /** Hex values for each recolored CSS custom property. */
  tokens: Record<AccentToken, string>
  /** Canvas selection chrome, the same in both themes, with text that reads on it. */
  selection: SelectionTheme
}

export function accentBaseColor(preference: AccentPreference): Color {
  if (preference.kind === 'preset') return parseColor(ACCENT_PRESET_COLORS[preference.preset])
  return parseColor(preference.color)
}

/** The canvas selection color a preset pins, or undefined when it follows the derived family. */
export function accentSelectionColor(preference: AccentPreference): Color | undefined {
  if (preference.kind !== 'preset') return undefined
  const pinned = ACCENT_PRESET_SELECTIONS[preference.preset]
  return pinned === undefined ? undefined : parseColor(pinned)
}

function clampLightness(lightness: number): number {
  return Math.min(ACCENT_LIGHTNESS_RANGE.max, Math.max(ACCENT_LIGHTNESS_RANGE.min, lightness))
}

/** Rounded to the hex the stylesheet receives, so contrast is checked on what is drawn. */
function drawn(color: Color): Color {
  return parseColor(colorToHex(color))
}

/**
 * Moves a reference token the way `base` differs from the default blue, in OkLCH, plus `shift`
 * in lightness.
 */
function relateTo(base: Color, shift: number): (reference: Color) => Color {
  const from = rgbaToOkHCL(REFERENCE_BASE)
  const to = rgbaToOkHCL(base)
  const lightness = clampLightness(to.l) - from.l + shift
  const chroma = to.c / from.c
  const hue = to.h - from.h
  return (reference) => {
    const color = rgbaToOkHCL(reference)
    return drawn(
      okhclToRGBA({ l: color.l + lightness, c: color.c * chroma, h: color.h + hue, a: 1 })
    )
  }
}

function worstContrast(text: Color, surfaces: Color[]): number {
  return Math.min(...surfaces.map((surface) => contrastRatio(text, surface)))
}

/**
 * `color` moved in OkLCH lightness, away from the theme's panels, by the smallest step that lets
 * it read as text on every one of them; returned as it is when it already does.
 */
function readableOnPanels(color: Color, theme: AccentTheme): Color {
  const panels = ACCENT_PANEL_COLORS[theme].map(parseColor)
  if (worstContrast(color, panels) >= ACCENT_TEXT_CONTRAST) return color
  const { l, c, h } = rgbaToOkHCL(color)
  const direction = theme === 'dark' ? 1 : -1
  for (let step = 1; step <= PRIMARY_LIGHTNESS_STEPS; step++) {
    const lightness = l + direction * step * PRIMARY_LIGHTNESS_STEP
    const candidate = drawn(okhclToRGBA({ l: lightness, c, h, a: 1 }))
    if (worstContrast(candidate, panels) >= ACCENT_TEXT_CONTRAST) return candidate
  }
  return direction > 0 ? WHITE : INK
}

/** White or ink, whichever reads worst-case better on every surface the text sits on. */
function accentForeground(surfaces: Color[]): Color {
  return maxBy([WHITE, INK], (text) => worstContrast(text, surfaces))
}

function surfaces(base: Color, theme: AccentTheme, shift: number) {
  const relate = relateTo(base, shift)
  const reference = REFERENCE_TOKENS[theme]
  return {
    relate,
    reference,
    accent: relate(parseColor(reference['--color-accent'])),
    selected: relate(parseColor(reference['--color-panel-selected'])),
    primary: readableOnPanels(relate(parseColor(reference['--color-primary'])), theme)
  }
}

/** How readable a family's text is: the lower of its accent and primary text contrasts. */
function textContrast({ accent, selected, primary }: ReturnType<typeof surfaces>): number {
  const accentSurfaces = [accent, selected]
  return Math.min(
    worstContrast(accentForeground(accentSurfaces), accentSurfaces),
    worstContrast(accentForeground([primary]), [primary])
  )
}

/** The family at the nearest shift whose text reaches AA, or the most readable one when none does. */
function readableFamily(base: Color, theme: AccentTheme): ReturnType<typeof surfaces> {
  let best = surfaces(base, theme, 0)
  let bestContrast = -Infinity
  for (const shift of LIGHTNESS_SHIFTS) {
    const candidate = shift === 0 ? best : surfaces(base, theme, shift)
    const contrast = textContrast(candidate)
    if (contrast >= ACCENT_TEXT_CONTRAST) return candidate
    if (contrast > bestContrast) {
      best = candidate
      bestContrast = contrast
    }
  }
  return best
}

/**
 * The accent family for `theme`, derived from one base color. When its text would fall short of
 * {@link ACCENT_TEXT_CONTRAST}, the family moves by the smallest lightness shift that reaches it;
 * primary text also reaches it on the theme's panels. `selection` pins the canvas selection color
 * instead of deriving it.
 */
export function deriveAccentPalette(
  base: Color,
  theme: AccentTheme,
  selection?: Color
): AccentPalette {
  const { relate, reference, accent, selected, primary } = readableFamily(base, theme)
  const foreground = accentForeground([accent, selected])
  const [panel] = ACCENT_PANEL_COLORS[theme]
  const tint = compositeOver(accent, parseColor(panel), ACCENT_TINT_AMOUNT)
  return {
    tokens: {
      '--color-accent': colorToHex(accent),
      '--color-panel-focus': colorToHex(relate(parseColor(reference['--color-panel-focus']))),
      '--color-panel-selected': colorToHex(selected),
      '--color-panel-selected-muted': colorToHex(tint),
      '--color-primary': colorToHex(primary),
      '--color-on-accent': colorToHex(foreground),
      '--color-on-primary': colorToHex(accentForeground([primary]))
    },
    selection: selection
      ? { color: selection, foreground: accentForeground([selection]) }
      : { color: relate(SELECTION_COLOR), foreground }
  }
}

/** The accent family a stored preference draws in `theme`, with any canvas selection it pins. */
export function resolveAccentPalette(
  preference: AccentPreference,
  theme: AccentTheme
): AccentPalette {
  return deriveAccentPalette(accentBaseColor(preference), theme, accentSelectionColor(preference))
}
