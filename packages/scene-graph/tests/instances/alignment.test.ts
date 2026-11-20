import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

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

test('an instance takes its component frame’s positioning', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, { layoutPositioning: 'AUTO' })
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24 })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')

  // The file has one positioning for the instance and its component frame, so the live instance
  // follows the component rather than keeping a value the file would overwrite.
  graph.updateNode(component.id, { layoutPositioning: 'ABSOLUTE' })
  graph.syncInstance(instance.id)

  expect(graph.getNode(instance.id)?.layoutPositioning).toBe('ABSOLUTE')
})

test('a layer inside an instance keeps no positioning of its own', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id)
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24 })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')
  const child = graph.getChildren(instance.id)[0]
  if (!child) throw new Error('Missing child')

  recordInstanceOverride(graph, child.id, ['layoutPositioning'])

  expect([...(instance.instanceOverrides.descendants.get(child.id)?.keys() ?? [])]).not.toContain(
    'layoutPositioning'
  )
})

test('an instance frame follows its component’s size limits and fill behaviour', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, { maxWidth: 100, layoutGrow: 0 })
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24 })
  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')

  // One record in the file carries both, so the instance frame shows the component's values.
  graph.updateNode(component.id, { maxWidth: 200, layoutGrow: 1 })
  graph.syncInstance(instance.id)

  expect(graph.getNode(instance.id)?.maxWidth).toBe(200)
  expect(graph.getNode(instance.id)?.layoutGrow).toBe(1)
})

test('a new instance already has the frame fields it follows', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, {
    maxWidth: 100,
    layoutGrow: 1,
    layoutPositioning: 'ABSOLUTE',
    layoutAlignSelf: 'MAX'
  })
  graph.createNode('RECTANGLE', component.id, { width: 40, height: 24 })

  const instance = graph.createInstance(component.id, page.id, { x: 0, y: 0 })
  if (!instance) throw new Error('Missing instance')

  // These fields are the component's in the file, so a new instance carries them from the start,
  // not after the component is next edited.
  expect(instance.maxWidth).toBe(100)
  expect(instance.layoutGrow).toBe(1)
  expect(instance.layoutPositioning).toBe('ABSOLUTE')
  expect(instance.layoutAlignSelf).toBe('MAX')
})
