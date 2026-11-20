import { expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

/** A graph that counts the layer reads of one operation. */
class CountingGraph extends SceneGraph {
  reads = 0

  override getNode(id: string): SceneNode | undefined {
    this.reads++
    return super.getNode(id)
  }
}

test('deleting a layer captures its subtree once, not once per layer and again', () => {
  const graph = new CountingGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, { name: 'Big', width: 400, height: 400 })
  const children = 300
  for (let index = 0; index < children; index++) {
    graph.createNode('RECTANGLE', frame.id, {
      x: (index % 20) * 20,
      y: Math.floor(index / 20) * 20,
      width: 18,
      height: 18
    })
  }
  const editor = createEditor({ graph })
  editor.state.currentPageId = page.id
  editor.select([frame.id])

  graph.reads = 0
  editor.deleteSelected()

  // One walk of the 301-layer subtree, with a little bookkeeping around it.
  expect(graph.reads).toBeLessThan(2 * (children + 1))
  expect(graph.getChildren(page.id)).toHaveLength(0)

  editor.undo.undo()
  expect(graph.getChildren(page.id).map((node) => node.id)).toEqual([frame.id])
  editor.dispose()
})
