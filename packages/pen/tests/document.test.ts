import { describe, expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@pairdraw/pen'

import { parseDocument } from './helpers/document'
import { FIXTURES } from './helpers/paths'

async function loadFixture(name: string): Promise<string> {
  return Bun.file(`${FIXTURES}/${name}`).text()
}

describe('parsePenFile', () => {
  test('keeps every layer of a file that repeats an ID', () => {
    const graph = parseDocument([
      { id: 'a', type: 'rectangle', width: 10, height: 10 },
      { id: 'a', type: 'ellipse', width: 10, height: 10 },
      { id: 'b', type: 'frame', children: [{ id: 'b', type: 'rectangle' }] }
    ])
    const page = graph.getPages()[0]
    const layers = graph.getChildren(page.id)
    expect(layers.map((layer) => layer.type)).toEqual(['RECTANGLE', 'ELLIPSE', 'FRAME'])
    expect(graph.getNode('a')?.type).toBe('RECTANGLE')
    const frame = graph.getNode('b')
    expect(frame?.type).toBe('FRAME')
    const inner = graph.getChildren('b')
    expect(inner.map((layer) => layer.type)).toEqual(['RECTANGLE'])
    expect(inner[0].id).not.toBe('b')
    expect(inner[0].parentId).toBe('b')
  })

  test('imports variables and theme modes', async () => {
    const graph = parsePenFile(await loadFixture('pencil_simple.pen'))
    const collections = [...graph.variableCollections.values()]

    expect(collections.length).toBe(1)
    expect(collections[0].modes.map((mode) => mode.name)).toEqual(['Light', 'Dark'])
    expect(graph.variables.size).toBeGreaterThan(0)
  })

  test('maps reusable frames to components', async () => {
    const graph = parsePenFile(await loadFixture('pencil_button.pen'))
    const components = [...graph.getAllNodes()].filter((node) => node.type === 'COMPONENT')

    expect(components.length).toBeGreaterThan(0)
    expect(components[0]?.name).toContain('Button')
  })

  test('maps path geometry to vector nodes', async () => {
    const graph = parsePenFile(await loadFixture('pencil_button.pen'))
    const vectors = [...graph.getAllNodes()].filter((node) => node.type === 'VECTOR')

    expect(vectors.length).toBeGreaterThan(0)
    expect(vectors.some((node) => (node.vectorNetwork?.vertices.length ?? 0) > 0)).toBe(true)
  })
})

describe('page name', () => {
  test('keeps the page name through a write and a read', () => {
    const graph = parseDocument([{ id: 'card', type: 'frame', width: 320, height: 200 }])
    const page = graph.getPages()[0]
    page.name = 'Card'

    const reread = parsePenFile(writePenDocument(graph))

    expect(reread.getPages()[0].name).toBe('Card')
  })
})

describe('token links', () => {
  const link = {
    id: 'link-app',
    kind: 'css' as const,
    name: 'app.css',
    path: 'styles/app.css',
    syncedAt: '2026-11-24T10:00:00.000Z',
    snapshot: { collection: { brand: 'color:#ff0000' } },
    names: { brand: 'Colors/brand' }
  }

  test('keeps the document’s token links through a write and a read', async () => {
    const { readTokenSources, tokenSourcesPluginData } =
      await import('@pairdraw/scene-graph/token-sources')
    const graph = parseDocument([{ id: 'screen', type: 'frame', width: 100, height: 100 }])
    graph.updateNode(graph.rootId, { pluginData: tokenSourcesPluginData(graph, [link]) })

    const reopened = parsePenFile(writePenDocument(graph))

    expect(readTokenSources(reopened)).toEqual([link])
  })

  test('drops a link it cannot read and keeps the rest', async () => {
    const { readTokenSources } = await import('@pairdraw/scene-graph/token-sources')
    const json = JSON.stringify({
      version: '2.21',
      children: [{ id: 'screen', type: 'frame' }],
      tokenSources: [
        link,
        { id: 'broken' },
        { id: 'another', kind: 'css', name: 'b.css', snapshot: {} }
      ]
    })

    const reopened = parsePenFile(json)

    expect(readTokenSources(reopened).map((source) => source.id)).toEqual(['link-app', 'another'])
  })
})
