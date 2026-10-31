import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { captureEditCheckpoint } from '@pairdraw/scene-graph/checkpoint'

function graphWithLayers() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const frame = graph.createNode('FRAME', pageId, { name: 'Frame' })
  const label = graph.createNode('TEXT', frame.id, { name: 'Label', text: 'Hi' })
  const other = graph.createNode('RECTANGLE', pageId, { name: 'Other' })
  return { graph, frame, label, other }
}

test('an edit checkpoint names only the layers the edit changed, as they were', () => {
  const { graph, label, other } = graphWithLayers()
  const checkpoint = captureEditCheckpoint(graph)
  graph.updateNode(label.id, { text: 'Changed' })
  const node = graph.getNode(other.id)
  if (node) node.opacity = 0.5

  const changed = checkpoint.changedNodes()
  expect([...changed.keys()].toSorted()).toEqual([label.id, other.id].toSorted())
  expect(changed.get(label.id)?.text).toBe('Hi')
  expect(changed.get(other.id)?.opacity).toBe(1)
  checkpoint.release()
})

test('a released checkpoint no longer copies layers the graph changes', () => {
  const { graph, label } = graphWithLayers()
  const checkpoint = captureEditCheckpoint(graph)
  checkpoint.release()
  graph.updateNode(label.id, { text: 'Changed' })
  // Still found by comparison, but from the reference taken up front.
  expect(checkpoint.changedNodes().get(label.id)?.text).toBe('Hi')
})

test('restoring puts back every layer object and its fields', () => {
  const { graph, frame, label, other } = graphWithLayers()
  const before = structuredClone(graph.nodes)
  const objects = new Map(graph.nodes)
  const checkpoint = captureEditCheckpoint(graph)
  graph.updateNode(label.id, { text: 'Changed' })
  graph.reparentNode(other.id, frame.id)
  graph.deleteNode(label.id)

  checkpoint.restore()
  checkpoint.release()
  expect(graph.nodes).toEqual(before)
  for (const [id, node] of objects) expect(graph.getNode(id)).toBe(node)
})
