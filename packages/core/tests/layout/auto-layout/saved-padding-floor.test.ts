import { beforeAll, describe, expect, test } from 'bun:test'

import { FigmaAPI } from '#core/figma-api'
import { exportFigFile, parseFigFile } from '#core/io/formats/fig'
import { computeAllLayouts } from '#core/layout'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

const PADDING = {
  paddingTop: 15,
  paddingRight: 20,
  paddingBottom: 15,
  paddingLeft: 20
} as const

beforeAll(async () => {
  await initCodec()
})

/** A document saved before the padding floor existed: a fixed frame smaller than its padding. */
async function oldSavedFile() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', page, {
    name: 'Saved',
    layoutMode: 'HORIZONTAL',
    width: 10,
    height: 10,
    primaryAxisSizing: 'FIXED',
    counterAxisSizing: 'FIXED',
    ...PADDING
  })
  graph.createNode('RECTANGLE', frame.id, { width: 5, height: 5, x: 3, y: 4 })
  const bytes = await exportFigFile(graph)
  return parseFigFile(bytes.buffer.slice(0) as ArrayBuffer)
}

const saved = (graph: SceneGraph) =>
  [...graph.getAllNodes()].find((node) => node.name === 'Saved') as SceneNode

describe('a saved frame smaller than its padding', () => {
  test('keeps its saved size when layout runs without an edit', async () => {
    const reopened = await oldSavedFile()
    const frame = saved(reopened)
    expect([frame.width, frame.height]).toEqual([10, 10])
    computeAllLayouts(reopened)
    expect([frame.width, frame.height]).toEqual([10, 10])
    expect(frame.source.editedFields).not.toContain('width')
    expect(frame.source.editedFields).not.toContain('height')
  })

  test('is not written out larger by a later save', async () => {
    const reopened = await oldSavedFile()
    computeAllLayouts(reopened)
    const bytes = await exportFigFile(reopened)
    const again = await parseFigFile(bytes.buffer.slice(0) as ArrayBuffer)
    const frame = saved(again)
    expect([frame.width, frame.height]).toEqual([10, 10])
  })

  test('grows to its padding once the user edits its layout', async () => {
    const reopened = await oldSavedFile()
    const frame = saved(reopened)
    reopened.updateNode(frame.id, { itemSpacing: 4 })
    computeAllLayouts(reopened)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('grows to its padding once the user resizes it', async () => {
    const reopened = await oldSavedFile()
    const frame = saved(reopened)
    const figma = new FigmaAPI(reopened)
    const proxy = figma.getNodeById(frame.id)
    if (!proxy) throw new Error('saved frame missing')
    proxy.resize(8, 8)
    computeAllLayouts(reopened)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })

  test('a fixed layer inside an instance keeps the size the instance gives it', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const instance = graph.createNode('INSTANCE', page, {
      layoutMode: 'HORIZONTAL',
      width: 120,
      height: 120,
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      paddingTop: 20,
      paddingBottom: 20
    })
    graph.updateNode(instance.id, { source: { ...instance.source, format: 'fig' } })
    const child = graph.createNode('FRAME', instance.id, {
      layoutMode: 'HORIZONTAL',
      width: 80,
      height: 80,
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      paddingTop: 1665,
      paddingBottom: 1665
    })
    computeAllLayouts(graph, page)
    expect([child.width, child.height]).toEqual([80, 80])
  })

  test('a fresh frame still grows right away', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', page, {
      layoutMode: 'HORIZONTAL',
      width: 10,
      height: 10,
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      ...PADDING
    })
    computeAllLayouts(graph)
    expect([frame.width, frame.height]).toEqual([40, 30])
  })
})
