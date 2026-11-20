import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

test('an instance takes its component frame’s own alignment', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, { layoutAlignSelf: 'MIN' })
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24 })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')

  // The file has one alignment for the instance and its component frame, so the live instance
  // follows the component rather than keeping an alignment the file would overwrite.
  graph.updateNode(component.id, { layoutAlignSelf: 'MAX' })
  graph.syncInstance(instance.id)

  expect(graph.getNode(instance.id)?.layoutAlignSelf).toBe('MAX')
})
