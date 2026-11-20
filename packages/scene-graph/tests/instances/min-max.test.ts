import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

test('a layer inside an instance keeps no size limit of its own', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id)
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24, maxWidth: 100 })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')
  const child = graph.getChildren(instance.id)[0]
  if (!child) throw new Error('Missing child')

  // The file has no field for a size limit an instance overrides, so the editor must not claim
  // one: reopening the document would come back without it.
  recordInstanceOverride(graph, child.id, ['maxWidth'])
  expect([...(instance.instanceOverrides.descendants.get(child.id)?.keys() ?? [])]).not.toContain(
    'maxWidth'
  )

  graph.updateNode(child.id, { maxWidth: 200 })
  graph.updateNode(component.id, {})
  graph.syncInstance(instance.id)
  expect(graph.getNode(child.id)?.maxWidth).toBe(100)
})
