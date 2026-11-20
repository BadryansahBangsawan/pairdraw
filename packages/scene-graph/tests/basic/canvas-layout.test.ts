import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

describe('a page', () => {
  test('takes no auto layout', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    // A page holds layers; it is not one of them, so no frame lays it out.
    expect(() => graph.updateNode(page.id, { layoutMode: 'HORIZONTAL' })).toThrow(/cannot hold auto layout/)
    expect(graph.getNode(page.id)?.layoutMode).toBe('NONE')
  })

  test('takes no layout alignment, spacing or padding', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    for (const changes of [
      { counterAxisAlign: 'BASELINE' },
      { layoutWrap: 'WRAP' },
      { itemSpacing: 8 },
      { paddingTop: 4 }
    ] as const)
      expect(() => graph.updateNode(page.id, changes)).toThrow(/cannot hold auto layout/)
    expect(graph.getNode(page.id)?.counterAxisAlign).toBe('MIN')
  })

  test('is built without the layout a file gives it, and still loads', () => {
    const graph = new SceneGraph()

    // An import describes a document rather than asking for an edit, so a page record carrying a
    // stack loses those fields instead of failing the whole file.
    const made = graph.createNode('CANVAS', graph.rootId, {
      name: 'Imported',
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      counterAxisAlign: 'BASELINE',
      itemSpacing: 40,
      paddingLeft: 100
    })
    expect(made.layoutMode).toBe('NONE')
    expect(made.counterAxisAlign).toBe('MIN')
    expect(made.itemSpacing).toBe(0)
    expect(made.paddingLeft).toBe(0)
    expect(made.name).toBe('Imported')

    const restored = graph.createNodeWithId('1:99', 'CANVAS', graph.rootId, {
      name: 'Restored',
      layoutMode: 'VERTICAL',
      primaryAxisAlign: 'MAX'
    })
    expect(restored.layoutMode).toBe('NONE')
    expect(restored.primaryAxisAlign).toBe('MIN')
  })

  test('keeps its layers finite, whatever a writer computes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, { name: 'Rect', width: 40, height: 40 })

    // A layout that cannot use its container can compute NaN; a document never holds one.
    graph.updateNode(rect.id, { x: Number.NaN, y: Number.POSITIVE_INFINITY })
    expect(graph.getNode(rect.id)?.x).toBe(0)
    expect(graph.getNode(rect.id)?.y).toBe(0)

    graph.updateNodePreview(rect.id, { width: Number.NaN })
    expect(graph.getNode(rect.id)?.width).toBe(40)
  })

  test('takes no auto layout in a preview either', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    expect(() => graph.updateNodePreview(page.id, { layoutWrap: 'WRAP' })).toThrow(/cannot hold auto layout/)
    expect(graph.getNode(page.id)?.layoutWrap).toBe('NO_WRAP')
  })
})
