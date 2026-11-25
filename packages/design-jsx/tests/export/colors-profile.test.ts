import { expect, test } from 'bun:test'

import { sceneNodeToJSX } from '@pairdraw/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

function card(profile: 'srgb' | 'display-p3') {
  const graph = new SceneGraph()
  graph.documentColorSpace = profile
  const page = graph.getPages()[0]
  const rect = graph.createNode('RECTANGLE', page.id, {
    name: 'Swatch',
    width: 40,
    height: 40,
    fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.4, b: 0.3, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, rectId: rect.id }
}

test('a Display P3 document writes its fill as the P3 color the canvas draws', () => {
  const { graph, rectId } = card('display-p3')
  expect(sceneNodeToJSX(rectId, graph)).toContain('color(display-p3 0.8 0.4 0.3)')
})

test('an sRGB document keeps writing the same hex', () => {
  const { graph, rectId } = card('srgb')
  expect(sceneNodeToJSX(rectId, graph)).toContain('#CC664D')
})
