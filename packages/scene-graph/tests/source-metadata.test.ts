import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

function firstPageId(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

describe('SceneGraph source dirty tracking', () => {
  test('records normalized edited fields once in update order', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECTANGLE', firstPageId(graph))

    graph.updateNode(node.id, { width: 200, fills: [] })
    graph.updateNode(node.id, { width: 240, opacity: 0.5 })

    expect(node.source.editedFields).toEqual(['width', 'fills', 'opacity'])
  })

  test('a rendered text picture is derived and does not count as an edit', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('TEXT', firstPageId(graph))

    graph.updateNode(node.id, { textPicture: new Uint8Array([1, 2, 3]) })

    expect(node.source.editedFields).toEqual([])
  })

  test('preservation scope suppresses import-time dirty tracking', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECTANGLE', firstPageId(graph))

    graph.preserveSourceMetadataDuring(() => graph.updateNode(node.id, { width: 200 }))

    expect(node.source.editedFields).toEqual([])
  })

  test('cloned source dirty fields are independent', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECTANGLE', firstPageId(graph))
    graph.updateNode(node.id, { width: 200 })
    const clone = graph.cloneTree(node.id, firstPageId(graph))
    expect(clone).not.toBeNull()
    if (!clone) return

    graph.updateNode(clone.id, { height: 300 })

    expect(node.source.editedFields).toEqual(['width'])
    expect(clone.source.editedFields).toEqual(['width', 'height'])
  })
})
