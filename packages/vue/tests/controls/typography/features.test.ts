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

test('the common switches come first, then the features the selected font has', () => {
  const { features } = setup()
  const tags = features.available.value.map((feature) => feature.tag)
  // Figma's common switches stay offered for any font, Inter's missing LIGA included.
  expect(tags.slice(0, 3)).toEqual(['LIGA', 'CALT', 'KERN'])
  expect(features.available.value.filter((feature) => feature.standard).map((f) => f.tag)).toEqual([
    'LIGA',
    'CALT',
    'KERN'
  ])
  // Inter's GSUB: contextual alternates, tabular figures, stylistic sets, slashed zero.
  expect(tags).toContain('TNUM')
  expect(tags).toContain('SS01')
  expect(tags).toContain('ZERO')
  // A feature Inter does not have is not offered.
  expect(tags).not.toContain('SMCP')
})

test('a font that is still loading offers the common switches, then its own features', async () => {
  const { features } = setup('Late Family')
  expect(features.available.value.map((feature) => feature.tag)).toEqual(['LIGA', 'CALT', 'KERN'])
  const data = await fontManager.fetchBundledFont('/InterVariable.ttf')
  if (!data) throw new Error('bundled Inter missing')
  await fontManager.markLoaded('Late Family', 'Regular', data)
  // A face arriving by any path, the renderer included, re-reads the list.
  expect(features.available.value.map((feature) => feature.tag)).toContain('TNUM')
  expect(features.available.value.map((feature) => feature.tag).slice(0, 3)).toEqual([
    'LIGA',
    'CALT',
    'KERN'
  ])
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
