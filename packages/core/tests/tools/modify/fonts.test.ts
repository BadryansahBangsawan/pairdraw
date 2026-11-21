import { describe, expect, test } from 'bun:test'

import { runTool, setupToolTest } from '#core-tests/helpers/tools'

describe('list_fonts', () => {
  test('keeps the released default: families and weights of the current page', async () => {
    const { graph, figma } = setupToolTest()
    const [page] = graph.getPages()
    const other = graph.addPage('Other')
    graph.createNode('TEXT', page.id, { fontFamily: 'Alpha', fontWeight: 700 })
    graph.createNode('TEXT', page.id, { fontFamily: 'Alpha', fontWeight: 400 })
    graph.createNode('TEXT', other.id, { fontFamily: 'Beta', fontWeight: 400 })

    // The shape 5dab96fba shipped: { count, fonts: [{ family, weights }] }, current page only.
    const result = await runTool(figma, 'list_fonts', {})
    expect(result).toEqual({ count: 1, fonts: [{ family: 'Alpha', weights: [400, 700] }] })
  })

  test('scope document reports faces from every page, missing ones first', async () => {
    const { graph, figma } = setupToolTest()
    const [page] = graph.getPages()
    const other = graph.addPage('Other')
    graph.createNode('TEXT', page.id, {
      fontFamily: 'Present',
      fontWeight: 400,
      fontStyle: 'Regular'
    })
    graph.createNode('TEXT', other.id, {
      fontFamily: 'Absent',
      fontWeight: 700,
      fontStyle: 'Bold',
      styleRuns: [{ start: 0, length: 1, style: { fontFamily: 'Present', fontWeight: 400 } }]
    })

    const result = (await runTool(figma, 'list_fonts', { scope: 'document' })) as {
      count: number
      fonts: Array<{ family: string; style: string; layerCount: number }>
    }
    expect(result.count).toBe(2)
    expect(
      result.fonts.map(({ family, style, layerCount }) => ({ family, style, layerCount }))
    ).toEqual([
      { family: 'Absent', style: 'Bold', layerCount: 1 },
      { family: 'Present', style: 'Regular', layerCount: 2 }
    ])
  })

  test('filters by family name', async () => {
    const { graph, figma } = setupToolTest()
    const page = graph.getPages()[0].id
    graph.createNode('TEXT', page, { fontFamily: 'Alpha Sans' })
    graph.createNode('TEXT', page, { fontFamily: 'Beta Serif' })
    const result = (await runTool(figma, 'list_fonts', { family: 'sans' })) as {
      fonts: Array<{ family: string }>
    }
    expect(result.fonts.map((font) => font.family)).toEqual(['Alpha Sans'])
  })
})

describe('replace_fonts', () => {
  test('replaces a face across the document and reports the counts', async () => {
    const { graph, figma } = setupToolTest()
    const page = graph.getPages()[0].id
    const text = graph.createNode('TEXT', page, {
      fontFamily: 'Old',
      fontWeight: 700,
      fontStyle: 'Bold',
      styleRuns: [
        { start: 0, length: 2, style: { fontFamily: 'Old', fontWeight: 700, fontStyle: 'Bold' } }
      ]
    })
    const result = await runTool(figma, 'replace_fonts', {
      replacements: [
        { from: { family: 'Old', style: 'Bold' }, to: { family: 'New', style: 'Regular' } }
      ]
    })
    expect(result).toEqual({ layers: 1, runs: 1, styles: 0 })
    expect(graph.getNode(text.id)?.fontFamily).toBe('New')
  })

  test('names a bad replacement', async () => {
    const { figma } = setupToolTest()
    await expect(runTool(figma, 'replace_fonts', { replacements: [] })).rejects.toThrow(
      'replacements'
    )
  })
})
