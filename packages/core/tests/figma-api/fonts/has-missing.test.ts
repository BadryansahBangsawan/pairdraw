import { beforeAll, describe, expect, test } from 'bun:test'

import { corePackagePath } from '#core-tests/helpers/paths'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import { FigmaAPI } from '#core/figma-api'
import { fontManager } from '#core/text/font/manager'

beforeAll(async () => {
  // The real bundled Inter, not a stand-in: the font manager is a process-wide singleton, and a
  // dummy buffer cached here would be the data a later renderer's loadFonts shapes its HUD font
  // from, which CanvasKit cannot open. hasMissingFont only asks whether the face is loaded.
  const inter = await Bun.file(corePackagePath('assets', 'InterVariable.ttf')).arrayBuffer()
  await fontManager.markLoaded('Inter', 'Regular', inter)
  await fontManager.markLoaded('Inter', 'Bold', inter)
})

function text(family: string, style = 'Regular') {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const node = figma.createText()
  node.characters = 'abc'
  graph.updateNode(node.id, { fontFamily: family, fontStyle: style })
  return node
}

describe('hasMissingFont', () => {
  test('is false for a face the document knows', () => {
    expect(text('Inter').hasMissingFont).toBe(false)
  })

  test('is true for a family the document does not have', () => {
    expect(text('Gone Sans').hasMissingFont).toBe(true)
  })

  test('is true for a known family at an unknown style', () => {
    expect(text('Inter', 'ExtraExtended').hasMissingFont).toBe(true)
  })

  test('is true while a range uses a missing face, false once that face loads', async () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const node = figma.createText()
    node.characters = 'abc def'
    node.setRangeFontName(4, 7, { family: 'Inter', style: 'Bold' })
    expect(node.hasMissingFont).toBe(false)
    const runs = (graph.getNode(node.id) as SceneNode).styleRuns
    runs[0] = { ...runs[0], style: { ...runs[0].style, fontFamily: 'Range Only Sans' } }
    graph.updateNode(node.id, { styleRuns: runs })
    expect(node.hasMissingFont).toBe(true)
    await fontManager.markLoaded('Range Only Sans', 'Bold', new ArrayBuffer(8))
    expect(node.hasMissingFont).toBe(false)
  })
})
