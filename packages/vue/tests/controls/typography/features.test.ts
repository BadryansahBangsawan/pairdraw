import { afterAll, beforeAll, expect, test } from 'bun:test'

import { computed } from 'vue'

import { createEditor } from '@pairdraw/core'
import { fontManager, WEB_FONT_PROVIDER_IDS } from '@pairdraw/core/text'

import { createTypographyFeatures } from '#vue/controls/typography/features'

const providers = fontManager.enabledOnlineFontProviders()

beforeAll(async () => {
  fontManager.setOnlineFontProviders({})
  const inter = await fontManager.fetchBundledFont('/InterVariable.ttf')
  if (!inter) throw new Error('bundled Inter missing')
  await fontManager.markLoaded('Inter', 'Regular', inter)
})

afterAll(() => {
  fontManager.setOnlineFontProviders(
    Object.fromEntries(WEB_FONT_PROVIDER_IDS.map((id) => [id, providers.includes(id)]))
  )
})

function setup(family = 'Inter') {
  const editor = createEditor()
  const text = editor.graph.createNode('TEXT', editor.state.currentPageId, {
    text: 'Hamburgefonts 0123',
    fontFamily: family
  })
  const features = createTypographyFeatures(
    editor,
    computed(() => [text])
  )
  return { editor, text, features }
}

test('the panel offers the features the selected font actually has', () => {
  const { features } = setup()
  const tags = features.available.value.map((feature) => feature.tag)
  // Inter's GSUB: contextual alternates, tabular figures, stylistic sets, slashed zero.
  expect(tags).toContain('CALT')
  expect(tags).toContain('TNUM')
  expect(tags).toContain('SS01')
  expect(tags).toContain('ZERO')
  // A feature Inter does not have is not offered.
  expect(tags).not.toContain('SMCP')
})

test('a font that is not loaded offers no features yet', () => {
  const { features } = setup('Never Loaded Family')
  expect(features.available.value).toEqual([])
})

test('a feature reads its state, defaulting on when the text has not set it', () => {
  const { text, features } = setup()
  expect(features.state('CALT')).toBe(true)
  text.fontFeatures = [{ tag: 'CALT', enabled: false }]
  expect(features.state('CALT')).toBe(false)
})

test('setting a feature keeps the others and records one undo step', () => {
  const { editor, text, features } = setup()
  text.fontFeatures = [{ tag: 'ZERO', enabled: true }]
  features.set('TNUM', true)
  expect(text.fontFeatures).toEqual([
    { tag: 'ZERO', enabled: true },
    { tag: 'TNUM', enabled: true }
  ])
  editor.undo.undo()
  expect(text.fontFeatures).toEqual([{ tag: 'ZERO', enabled: true }])
})

test("setting a feature on a styled range keeps the range's other features", () => {
  const { text, features } = setup()
  text.styleRuns = [
    { start: 0, length: 5, style: { fontFeatures: [{ tag: 'SS02', enabled: true }] } }
  ]
  features.set('TNUM', true)
  expect(text.fontFeatures.some((feature) => feature.tag === 'TNUM' && feature.enabled)).toBe(true)
  expect(text.styleRuns[0]?.style.fontFeatures).toEqual([
    { tag: 'SS02', enabled: true },
    { tag: 'TNUM', enabled: true }
  ])
})
