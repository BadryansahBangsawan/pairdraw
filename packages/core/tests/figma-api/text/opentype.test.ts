import { beforeAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { fontManager } from '@pairdraw/core/text'
import { SceneGraph } from '@pairdraw/scene-graph'

function styledText(characters = 'Hamburgefonts 0123') {
  const api = new FigmaAPI(new SceneGraph())
  const text = api.createText()
  text.characters = characters
  return { api, text }
}

beforeAll(async () => {
  const inter = expectDefined(
    await fontManager.fetchBundledFont('/InterVariable.ttf'),
    'bundled Inter font'
  )
  await fontManager.markLoaded('Inter', 'Regular', inter)
})

test('a range takes OpenType features and reads them back', () => {
  const { text } = styledText()
  text.setRangeOpenTypeFeatures(0, 5, { TNUM: true, LIGA: false })

  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({ TNUM: true, LIGA: false })
  // The rest of the text keeps the font's defaults: no explicit features.
  expect(text.getRangeOpenTypeFeatures(5, 18)).toEqual({})
})

test('a range feature edit keeps the features the range already had', () => {
  const { text } = styledText()
  text.setRangeOpenTypeFeatures(0, 5, { TNUM: true, SS02: true })
  text.setRangeOpenTypeFeatures(0, 5, { TNUM: false })

  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({ TNUM: false, SS02: true })
})

test('a feature map with a non-boolean value is refused before anything changes', () => {
  const { text } = styledText()
  expect(() =>
    text.setRangeOpenTypeFeatures(0, 5, { TNUM: 'yes' } as unknown as Record<string, boolean>)
  ).toThrow('setRangeOpenTypeFeatures')
  expect(text.getRangeOpenTypeFeatures(0, 5)).toEqual({})
})

test('an empty range is refused, as the other range setters refuse it', () => {
  const { text } = styledText()
  expect(() => text.setRangeOpenTypeFeatures(3, 3, { TNUM: true })).toThrow(
    'setRangeOpenTypeFeatures'
  )
})