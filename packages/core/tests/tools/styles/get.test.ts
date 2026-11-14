import { describe, expect, test } from 'bun:test'

import { setupToolTest, runTool } from '#core-tests/helpers/tools'
import { wcagContrast } from 'culori'
import * as v from 'valibot'

import {
  getStyleArchetype,
  searchStyleArchetypes,
  STYLE_ARCHETYPE_IDS,
  STYLE_ARCHETYPES
} from '@pairdraw/core/tools'

const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/
const AA = 4.5
const GUIDE_SECTIONS = [
  '## Layout',
  '## Typography',
  '## Color',
  '## Shape and depth',
  '## Imagery and icons',
  '## Components',
  '## Avoid'
]

describe('style archetypes', () => {
  test('every listed id has one direction, in the order of the ids', () => {
    expect(STYLE_ARCHETYPES.map((archetype) => archetype.id)).toEqual([...STYLE_ARCHETYPE_IDS])
  })

  test.each([...STYLE_ARCHETYPES])('$id has tokens the tools take', (archetype) => {
    for (const color of Object.values(archetype.palette)) expect(color).toMatch(HEX)
    if (archetype.elevation?.color) expect(archetype.elevation.color).toMatch(HEX)
    expect(archetype.typeScale.length).toBeGreaterThanOrEqual(5)
    expect([...archetype.typeScale].sort((a, b) => a - b)).toEqual([...archetype.typeScale])
    expect(archetype.radius.small).toBeLessThanOrEqual(archetype.radius.medium)
    expect(archetype.radius.medium).toBeLessThanOrEqual(archetype.radius.large)
    expect(archetype.spacing.section).toBeGreaterThan(archetype.spacing.unit)
    expect(archetype.tags.length).toBeGreaterThan(0)
    expect(archetype.bestFor.length).toBeGreaterThan(0)
  })

  test.each([...STYLE_ARCHETYPES])('$id keeps its text readable (WCAG AA)', ({ palette }) => {
    expect(wcagContrast(palette.text, palette.background)).toBeGreaterThanOrEqual(AA)
    expect(wcagContrast(palette.text, palette.surface)).toBeGreaterThanOrEqual(AA)
    expect(wcagContrast(palette.mutedText, palette.background)).toBeGreaterThanOrEqual(AA)
    expect(wcagContrast(palette.mutedText, palette.surface)).toBeGreaterThanOrEqual(AA)
    expect(wcagContrast(palette.onAccent, palette.accent)).toBeGreaterThanOrEqual(AA)
  })

  test.each([...STYLE_ARCHETYPE_IDS])('%s comes with its written guide', (id) => {
    const style = getStyleArchetype(id)
    expect(style?.id).toBe(id)
    for (const section of GUIDE_SECTIONS) expect(style?.guide).toContain(section)
  })

  test('a request finds the directions that fit it first', () => {
    const crypto = searchStyleArchetypes({ query: 'Dark crypto dashboard' })
    expect(crypto.matched).toBe(true)
    expect(crypto.archetypes[0]?.id).toBe('fintech-night')
    expect(searchStyleArchetypes({ query: 'magazine' }).archetypes[0]?.id).toBe('editorial-serif')
  })

  test('without a match or a query it lists every direction of the appearance', () => {
    const none = searchStyleArchetypes({ query: 'zzzz qqqq' })
    expect(none.matched).toBe(false)
    expect(none.archetypes).toHaveLength(STYLE_ARCHETYPES.length)
    const dark = searchStyleArchetypes({ appearance: 'dark' })
    expect(dark.archetypes.length).toBeGreaterThan(0)
    expect(dark.archetypes.every((archetype) => archetype.appearance === 'dark')).toBe(true)
  })
})

describe('get_style', () => {
  test('lists directions with what picks one, best match first', async () => {
    const { figma } = setupToolTest()
    const result = v.parse(
      v.object({ matched: v.boolean(), styles: v.array(v.object({ id: v.string() })) }),
      await runTool(figma, 'get_style', { query: 'calm wellness app' })
    )
    expect(result.matched).toBe(true)
    expect(result.styles[0]?.id).toBe('wellness-calm')
  })

  test('returns one direction in full with how to apply it', async () => {
    const { figma } = setupToolTest()
    const result = await runTool(figma, 'get_style', { id: 'terminal' })
    expect(result).toMatchObject({
      style: {
        id: 'terminal',
        appearance: 'dark',
        fonts: { body: { family: 'JetBrains Mono' } },
        guide: expect.stringContaining('## Avoid')
      },
      apply: expect.stringContaining('set_effects')
    })
  })

  test('refuses an id it does not have', async () => {
    const { figma } = setupToolTest()
    await expect(runTool(figma, 'get_style', { id: 'halo' })).rejects.toThrow(
      'Invalid arguments for get_style'
    )
  })
})
