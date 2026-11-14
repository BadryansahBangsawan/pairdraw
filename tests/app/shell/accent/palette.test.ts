import { describe, expect, test } from 'bun:test'

import { SELECTION_COLOR } from '@pairdraw/core/constants'
import { contrastRatio, parseColor, rgbaToOkHCL } from '@pairdraw/scene-graph/color'

import {
  ACCENT_LIGHTNESS_RANGE,
  ACCENT_PANEL_COLORS,
  accentBaseColor,
  deriveAccentPalette,
  resolveAccentPalette,
  type AccentTheme
} from '@/app/shell/accent/palette'
import { ACCENT_PRESETS } from '@/app/shell/accent/schema'

const THEMES: AccentTheme[] = ['dark', 'light']

function palette(color: string, theme: AccentTheme) {
  return deriveAccentPalette(accentBaseColor({ kind: 'custom', color }), theme)
}

describe('deriveAccentPalette', () => {
  test('the Pairdraw preset reproduces the stylesheet tokens and pins the brand orange selection', () => {
    const pairdraw = { kind: 'preset', preset: 'pairdraw' } as const
    expect(resolveAccentPalette(pairdraw, 'dark').tokens).toEqual({
      '--color-accent': '#FF5B2E',
      '--color-panel-focus': '#FF8469',
      '--color-panel-selected': '#F76E52',
      '--color-panel-selected-muted': '#372421',
      '--color-primary': '#FFB4A9',
      '--color-on-accent': '#17171C',
      '--color-on-primary': '#17171C'
    })
    expect(resolveAccentPalette(pairdraw, 'light').tokens).toEqual({
      '--color-accent': '#FF5B2E',
      '--color-panel-focus': '#FF5B2E',
      '--color-panel-selected': '#FF5B2E',
      '--color-panel-selected-muted': '#FFEBE6',
      '--color-primary': '#D42E00',
      '--color-on-accent': '#17171C',
      '--color-on-primary': '#FFFFFF'
    })
    for (const theme of THEMES) {
      const { selection } = resolveAccentPalette(pairdraw, theme)
      expect(selection.color).toEqual(parseColor('#FF5B2E'))
      expect(selection.foreground).toEqual(parseColor('#17171C'))
    }
  })

  test('the blue preset keeps the calibration family and the canvas selection constant', () => {
    const blue = { kind: 'preset', preset: 'blue' } as const
    expect(resolveAccentPalette(blue, 'dark').tokens).toEqual({
      '--color-accent': '#2563EB',
      '--color-panel-focus': '#3B82F6',
      '--color-panel-selected': '#2F6FDD',
      '--color-panel-selected-muted': '#1D2537',
      '--color-primary': '#60A5FA',
      '--color-on-accent': '#FFFFFF',
      '--color-on-primary': '#17171C'
    })
    expect(resolveAccentPalette(blue, 'light').tokens).toEqual({
      '--color-accent': '#2563EB',
      '--color-panel-focus': '#2563EB',
      '--color-panel-selected': '#2563EB',
      '--color-panel-selected-muted': '#E5ECFD',
      '--color-primary': '#1D4ED8',
      '--color-on-accent': '#FFFFFF',
      '--color-on-primary': '#FFFFFF'
    })
    const selection = resolveAccentPalette(blue, 'dark').selection
    expect(selection.color.r).toBeCloseTo(SELECTION_COLOR.r, 2)
    expect(selection.color.g).toBeCloseTo(SELECTION_COLOR.g, 2)
    expect(selection.color.b).toBeCloseTo(SELECTION_COLOR.b, 2)
    expect(selection.foreground).toEqual(parseColor('#FFFFFF'))
  })

  test('every preset keeps its accent text readable, white on all but the Pairdraw orange', () => {
    for (const preset of ACCENT_PRESETS) {
      for (const theme of THEMES) {
        const { tokens } = resolveAccentPalette({ kind: 'preset', preset }, theme)
        const onAccent = parseColor(tokens['--color-on-accent'])
        for (const surface of ['--color-accent', '--color-panel-selected'] as const) {
          expect(contrastRatio(onAccent, parseColor(tokens[surface]))).toBeGreaterThanOrEqual(4.5)
        }
        expect(tokens['--color-on-accent']).toBe(preset === 'pairdraw' ? '#17171C' : '#FFFFFF')
      }
    }
  })

  test('primary text reaches AA contrast on every panel surface of its theme', () => {
    const custom = ['#FF5B2E', '#FFEE00', '#808080', '#00A0A0', '#000000', '#FFFFFF']
    for (const theme of THEMES) {
      const families = [
        ...ACCENT_PRESETS.map((preset) => resolveAccentPalette({ kind: 'preset', preset }, theme)),
        ...custom.map((color) => palette(color, theme))
      ]
      for (const { tokens } of families) {
        const primary = parseColor(tokens['--color-primary'])
        for (const panel of ACCENT_PANEL_COLORS[theme]) {
          expect(contrastRatio(primary, parseColor(panel))).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  test('a light custom accent switches its text to dark ink, on the canvas too', () => {
    for (const theme of THEMES) {
      const { tokens, selection } = palette('#FFEE00', theme)
      expect(tokens['--color-on-accent']).toBe('#17171C')
      expect(selection.foreground).toEqual(parseColor('#17171C'))
    }
    expect(palette('#FFEE00', 'dark').tokens['--color-on-primary']).toBe('#17171C')
  })

  test('pulls near-black and near-white picks into a visible lightness', () => {
    for (const color of ['#000000', '#FFFFFF']) {
      const lightness = rgbaToOkHCL(parseColor(palette(color, 'dark').tokens['--color-accent'])).l
      expect(lightness).toBeGreaterThan(ACCENT_LIGHTNESS_RANGE.min - 0.05)
      expect(lightness).toBeLessThan(ACCENT_LIGHTNESS_RANGE.max + 0.05)
    }
  })

  test('moves a custom accent until its text reaches AA contrast on accent and primary surfaces', () => {
    for (const color of ['#808080', '#00A0A0', '#FF4FA0']) {
      for (const theme of THEMES) {
        const { tokens } = palette(color, theme)
        const onAccent = parseColor(tokens['--color-on-accent'])
        const onPrimary = parseColor(tokens['--color-on-primary'])
        for (const surface of ['--color-accent', '--color-panel-selected'] as const) {
          expect(contrastRatio(onAccent, parseColor(tokens[surface]))).toBeGreaterThanOrEqual(4.5)
        }
        expect(
          contrastRatio(onPrimary, parseColor(tokens['--color-primary']))
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('the unfocused selection tint is a faint shade of the accent over the panel', () => {
    for (const theme of THEMES) {
      const { tokens } = palette('#A16207', theme)
      const tint = parseColor(tokens['--color-panel-selected-muted'])
      const [panel] = ACCENT_PANEL_COLORS[theme]
      expect(contrastRatio(tint, parseColor(panel))).toBeLessThan(1.3)
      const accentHue = rgbaToOkHCL(parseColor(tokens['--color-accent'])).h
      expect(Math.abs(rgbaToOkHCL(tint).h - accentHue)).toBeLessThan(10)
    }
  })

  test('the canvas selection follows the accent hue but not the interface theme', () => {
    const dark = palette('#15803D', 'dark').selection
    expect(palette('#15803D', 'light').selection).toEqual(dark)
    expect(dark.color.g).toBeGreaterThan(dark.color.b)
    expect(dark.color.g).toBeGreaterThan(dark.color.r)
  })
})
