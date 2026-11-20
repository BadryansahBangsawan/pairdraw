import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

function setup() {
  const { graph, figma } = setupToolTest()
  const page = expectDefined(graph.getPages()[0], 'page')
  const text = graph.createNode('TEXT', page.id, {
    name: 'Numbers',
    width: 200,
    height: 20,
    text: 'Hamburgefonts 0123'
  })
  return { graph, figma, text }
}

describe('set_text_properties font_features', () => {
  test('sets OpenType features on the whole text', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_text_properties', {
      id: text.id,
      font_features: { TNUM: true, LIGA: false, SS02: true }
    })
    expect(result).toEqual({ id: text.id, updated: ['fontFeatures'] })
    expect(getNodeOrThrow(graph, text.id).fontFeatures).toEqual([
      { tag: 'TNUM', enabled: true },
      { tag: 'LIGA', enabled: false },
      { tag: 'SS02', enabled: true }
    ])
  })

  test('a feature edit keeps the features the text already had', async () => {
    const { graph, figma, text } = setup()
    await runTool(figma, 'set_text_properties', {
      id: text.id,
      font_features: { TNUM: true, ZERO: true }
    })
    await runTool(figma, 'set_text_properties', { id: text.id, font_features: { TNUM: false } })
    expect(getNodeOrThrow(graph, text.id).fontFeatures).toEqual([
      { tag: 'TNUM', enabled: false },
      { tag: 'ZERO', enabled: true }
    ])
  })

  test('a non-boolean feature value is refused before anything changes', async () => {
    const { graph, figma, text } = setup()
    await expect(
      runTool(figma, 'set_text_properties', { id: text.id, font_features: { TNUM: 'yes' } })
    ).rejects.toThrow('font_features.TNUM')
    expect(getNodeOrThrow(graph, text.id).fontFeatures).toEqual([])
  })
})

describe('set_font_range font_features', () => {
  test('sets OpenType features on a range, keeping the rest of the text', async () => {
    const { graph, figma, text } = setup()
    const result = await runTool(figma, 'set_font_range', {
      id: text.id,
      start: 0,
      end: 5,
      font_features: { SMCP: true }
    })
    expect(result).toMatchObject({ id: text.id, range: { start: 0, end: 5 } })
    const node = getNodeOrThrow(graph, text.id)
    expect(node.styleRuns).toHaveLength(1)
    expect(node.styleRuns[0]?.style.fontFeatures).toEqual([{ tag: 'SMCP', enabled: true }])
    expect(node.fontFeatures).toEqual([])
  })

  test('features alone style a range without naming a font', async () => {
    const { figma, text } = setup()
    const result = await runTool(figma, 'set_font_range', {
      id: text.id,
      start: 2,
      end: 4,
      font_features: { TNUM: true }
    })
    expect(result).toMatchObject({ range: { start: 2, end: 4 } })
    expect(result).not.toHaveProperty('error')
  })

  test('a non-boolean feature value is refused before anything changes', async () => {
    const { graph, figma, text } = setup()
    await expect(
      runTool(figma, 'set_font_range', {
        id: text.id,
        start: 0,
        end: 5,
        font_features: { TNUM: 1 }
      })
    ).rejects.toThrow('font_features.TNUM')
    expect(getNodeOrThrow(graph, text.id).styleRuns).toEqual([])
  })
})
