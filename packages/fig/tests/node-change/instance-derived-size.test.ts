import { expect, test } from 'bun:test'

import { derivedSymbolDataOf } from '#fig/instance-overrides/types'
import { sceneNodeToKiwi } from '#fig/node-change/index'

import { SceneGraph } from '@pairdraw/scene-graph'

/**
 * An instance whose component holds a plain layer, a text and a nested instance, each given another
 * size on the instance.
 */
function resizedInstance() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const inner = graph.createNode('COMPONENT', page.id, { name: 'Inner', width: 40, height: 40 })
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Card',
    width: 200,
    height: 120
  })
  graph.createNode('RECTANGLE', component.id, {
    name: 'Box',
    width: 100,
    height: 20
  })
  graph.createNode('TEXT', component.id, {
    name: 'Label',
    text: 'Placeholder',
    width: 80,
    height: 20,
    textAutoResize: 'WIDTH_AND_HEIGHT'
  })
  const nested = graph.createInstance(inner.id, component.id)
  if (!nested) throw new Error('Expected the nested instance')
  const owner = graph.createInstance(component.id, page.id)
  if (!owner) throw new Error('Expected the instance')
  const [boxCopy, labelCopy, nestedCopy] = graph.getChildren(owner.id)
  if (!boxCopy || !labelCopy || !nestedCopy) throw new Error('Expected the instance copies')
  graph.updateNode(boxCopy.id, { width: 160, height: 32 })
  graph.updateNode(labelCopy.id, { text: '2', width: 8 })
  graph.updateNode(nestedCopy.id, { width: 60, height: 60 })
  return { graph, owner }
}

test('a descendant size claim is written for a nested instance and a text alone', () => {
  const { graph, owner } = resizedInstance()
  const change = sceneNodeToKiwi(owner, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])[0]
  const entries = derivedSymbolDataOf(change)
  // The entries follow the instance's layers: the rectangle, the text, then the nested instance.
  expect(entries.map((entry) => entry.size)).toEqual([undefined, { x: 8, y: 20 }, { x: 60, y: 60 }])
  expect(entries.map((entry) => entry.transform !== undefined)).toEqual([true, true, true])
})
