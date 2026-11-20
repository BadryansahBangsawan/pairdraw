import { beforeAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { PairdrawAPI } from '@pairdraw/core/pairdraw-api'
import { fontManager } from '@pairdraw/core/text'
import { SceneGraph } from '@pairdraw/scene-graph'

function styledText(characters = 'Hamburgefonts 0123') {
  const api = new FigmaAPI(new SceneGraph())
  const text = api.createText()
  text.characters = characters
  return { api, pairdraw: new PairdrawAPI(api), text }
}

beforeAll(async () => {
  const inter = expectDefined(
    await fontManager.fetchBundledFont('/InterVariable.ttf'),
    'bundled Inter font'
  )
  await fontManager.markLoaded('Inter', 'Regular', inter)
})

test('a range takes OpenType features and reads them back', () => {
  const { pairdraw, text } = styledText()
  pairdraw.setRangeFontFeatures(text, 0, 5, { TNUM: true, LIGA: false })

  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({ TNUM: true, LIGA: false })
  // The rest of the text keeps the font's defaults: no explicit features.
  expect(text.getRangeOpenTypeFeatures(5, 18)).toEqual({})
})

test('the whole text reads its features, and pairdraw merges toggles into them', () => {
  const { api, pairdraw, text } = styledText()
  // Figma types openTypeFeatures as every feature tag; Pairdraw returns only those set, so the
  // test reads the model's own list, as the compatibility note describes.
  const features = () => api.graph.getNode(text.id)?.fontFeatures
  expect(features()).toEqual([])
  pairdraw.setFontFeatures(text, { TNUM: true, ZERO: true })
  pairdraw.setFontFeatures(text, { TNUM: false })
  expect(features()).toEqual([
    { tag: 'TNUM', enabled: false },
    { tag: 'ZERO', enabled: true }
  ])
})

test('a range feature edit keeps the features the range already had', () => {
  const { pairdraw, text } = styledText()
  pairdraw.setRangeFontFeatures(text, 0, 5, { TNUM: true, SS02: true })
  pairdraw.setRangeFontFeatures(text, 0, 5, { TNUM: false })

  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({ TNUM: false, SS02: true })
})

test('a feature map with a non-boolean value is refused before anything changes', () => {
  const { pairdraw, text } = styledText()
  // The API takes a tag-to-boolean map; a script can send anything, so the setter validates.
  const badMap: Record<string, unknown> = { TNUM: 'yes' }
  const setRange = pairdraw.setRangeFontFeatures.bind(pairdraw)
  expect(() => Reflect.apply(setRange, pairdraw, [text, 0, 5, badMap])).toThrow(
    'setRangeFontFeatures'
  )
  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({})
})

test('an empty range is refused, as the other range setters refuse it', () => {
  const { pairdraw, text } = styledText()
  expect(() => pairdraw.setRangeFontFeatures(text, 3, 3, { TNUM: true })).toThrow(
    'setRangeFontFeatures'
  )
})
