import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import { listDocumentFonts, replaceDocumentFonts } from '#core/text/replace-fonts'

function text(graph: SceneGraph, pageId: string, fields: Partial<SceneNode>): SceneNode {
  return graph.createNode('TEXT', pageId, fields)
}

describe('listDocumentFonts', () => {
  test('names every face of a layer and its runs, counting each layer once', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    text(graph, page, {
      name: 'Title',
      fontFamily: 'Alpha',
      fontWeight: 700,
      fontStyle: 'Bold',
      styleRuns: [
        {
          start: 0,
          length: 2,
          style: { fontFamily: 'Beta', fontWeight: 400, fontStyle: 'Regular' }
        }
      ]
    })
    text(graph, page, {
      name: 'Body',
      fontFamily: 'Alpha',
      fontWeight: 700,
      fontStyle: 'Bold',
      styleRuns: [
        { start: 0, length: 1, style: { fontFamily: 'Alpha', fontWeight: 700, fontStyle: 'Bold' } }
      ]
    })

    const fonts = listDocumentFonts(graph).map(({ family, style, layerCount }) => ({
      family,
      style,
      layerCount
    }))
    expect(fonts).toEqual([
      { family: 'Alpha', style: 'Bold', layerCount: 2 },
      { family: 'Beta', style: 'Regular', layerCount: 1 }
    ])
  })

  test('puts a missing face before an available one and flags it', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    text(graph, page, { fontFamily: 'Present', fontWeight: 400, fontStyle: 'Regular' })
    text(graph, page, { fontFamily: 'Absent', fontWeight: 700, fontStyle: 'Bold' })
    const manager = {
      loadedFontSource: (family: string) => (family === 'Present' ? 'installed' : null)
    }
    expect(listDocumentFonts(graph, manager)).toEqual([
      { family: 'Absent', style: 'Bold', missing: true, layerCount: 1 },
      { family: 'Present', style: 'Regular', missing: false, layerCount: 1 }
    ])
  })

  test('lists a text style’s face too, even with no layer drawing it', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const style = text(graph, page, {
      name: 'Heading',
      fontFamily: 'Gamma',
      fontWeight: 600,
      fontStyle: 'Semi Bold',
      sharedStyleType: 'TEXT',
      internalOnly: true
    })
    style.source.id = 'style:heading'
    expect(listDocumentFonts(graph)).toEqual([
      { family: 'Gamma', style: 'Semi Bold', missing: true, layerCount: 0 }
    ])
  })
})

describe('replaceDocumentFonts', () => {
  test('replaces a layer face, its runs, and a text style, leaving other faces alone', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const layer = text(graph, page, {
      name: 'Title',
      fontFamily: 'Old',
      fontWeight: 700,
      fontStyle: 'Bold',
      textStyleId: 'style:title',
      styleRuns: [
        { start: 0, length: 2, style: { fontFamily: 'Old', fontWeight: 700, fontStyle: 'Bold' } },
        {
          start: 2,
          length: 2,
          style: { fontFamily: 'Keep', fontWeight: 400, fontStyle: 'Regular' }
        }
      ]
    })
    const style = text(graph, page, {
      name: 'Title style',
      fontFamily: 'Old',
      fontWeight: 700,
      fontStyle: 'Bold',
      sharedStyleType: 'TEXT',
      internalOnly: true
    })
    style.source.id = 'style:title'

    const counts = replaceDocumentFonts(graph, [
      { from: { family: 'Old', style: 'Bold' }, to: { family: 'New', style: 'Semi Bold' } }
    ])

    expect(counts).toEqual({ layers: 1, runs: 1, styles: 1 })
    const changed = graph.getNode(layer.id) as SceneNode
    expect({
      family: changed.fontFamily,
      weight: changed.fontWeight,
      style: changed.fontStyle
    }).toEqual({ family: 'New', weight: 600, style: 'Semi Bold' })
    expect(changed.textStyleId).toBe('style:title')
    expect(changed.styleRuns.map((run) => run.style.fontFamily)).toEqual(['New', 'Keep'])
    const styled = graph.getNode(style.id) as SceneNode
    expect(styled.fontFamily).toBe('New')
    expect(styled.fontWeight).toBe(600)
  })

  test('refuses the same source face twice', () => {
    const graph = new SceneGraph()
    expect(() =>
      replaceDocumentFonts(graph, [
        { from: { family: 'A', style: 'Regular' }, to: { family: 'B', style: 'Regular' } },
        { from: { family: 'A', style: 'Regular' }, to: { family: 'C', style: 'Regular' } }
      ])
    ).toThrow('is replaced twice')
  })
})
