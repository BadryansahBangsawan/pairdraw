import { describe, expect, test } from 'bun:test'

import { parsePenFile } from '@pairdraw/pen'

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
