import { beforeAll, describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { registerTestFont } from '#core-tests/helpers/figma-api'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

beforeAll(async () => {
  await registerTestFont()
  await registerTestFont('Swap Sans')
})

describe('replace_matching_properties on text', () => {
  test('swaps a font family and size, keeping the style, and loads the new font first', async () => {
    const { figma, graph } = setupToolTest()
    const label = figma.createText()
    label.characters = 'Label'
    label.fontSize = 14
    const other = figma.createText()
    other.characters = 'Other'
    other.fontSize = 20

    const result = await runTool(figma, 'replace_matching_properties', {
      font_family: [{ from: 'inter', to: 'Swap Sans' }],
      font_size: [{ from: 14, to: 18 }]
    })

    expect(result).toMatchObject({ replaced: { font_family: 2, font_size: 1 }, changed: 2 })
    expect(getNodeOrThrow(graph, label.id)).toMatchObject({ fontFamily: 'Swap Sans', fontSize: 18 })
    expect(getNodeOrThrow(graph, other.id)).toMatchObject({ fontFamily: 'Swap Sans', fontSize: 20 })
  })

  test('swaps the size of one range of mixed text only', async () => {
    const { figma } = setupToolTest()
    const label = figma.createText()
    label.characters = 'Hello world'
    label.fontSize = 14
    label.setRangeFontSize(0, 5, 24)

    await runTool(figma, 'replace_matching_properties', { font_size: [{ from: 24, to: 30 }] })

    expect(label.getRangeFontSize(0, 5)).toBe(30)
    expect(label.getRangeFontSize(5, 11)).toBe(14)
  })

  test('a font that cannot load is reported and the text is left as it was', async () => {
    const { figma, graph } = setupToolTest()
    const label = figma.createText()
    label.characters = 'Label'
    const before = structuredClone(getNodeOrThrow(graph, label.id))

    expect(
      await runTool(figma, 'replace_matching_properties', {
        font_family: [{ from: 'Inter', to: 'Nowhere Sans' }]
      })
    ).toEqual({ error: 'The font "Nowhere Sans Regular" could not be loaded' })
    expect(getNodeOrThrow(graph, label.id)).toEqual(before)
  })

  test('text colors swap apart from other fills', async () => {
    const { figma, graph } = setupToolTest()
    const label = figma.createText()
    label.characters = 'Label'
    label.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
    const box = figma.createRectangle()
    box.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]

    const result = await runTool(figma, 'replace_matching_properties', {
      text_color: [{ from: '#000000', to: '#ffffff' }]
    })

    expect(result).toMatchObject({ replaced: { text_color: 1 }, ids: [label.id] })
    expect(getNodeOrThrow(graph, label.id).fills[0]?.color).toMatchObject({ r: 1, g: 1, b: 1 })
    expect(getNodeOrThrow(graph, box.id).fills[0]?.color).toMatchObject({ r: 0, g: 0, b: 0 })
  })
})
