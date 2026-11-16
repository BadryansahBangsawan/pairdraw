import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

const io = new IORegistry(BUILTIN_IO_FORMATS)

function twoFrames() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('FRAME', page.id, { name: 'Header', width: 320, height: 40 })
  graph.createNode('FRAME', page.id, { name: 'Footer', width: 320, height: 40 })
  return { graph, page }
}

describe('JSX export', () => {
  test('a page exports its top-level layers', async () => {
    const { graph, page } = twoFrames()
    const result = await io.exportContent('jsx', {
      graph,
      target: { scope: 'page', pageId: page.id }
    })
    expect(result.data).toContain('Header')
    expect(result.data).toContain('Footer')
  })

  test('a document exports its first page', async () => {
    const { graph } = twoFrames()
    const result = await io.exportContent('jsx', { graph, target: { scope: 'document' } })
    expect(result.data).toContain('Header')
  })
})
