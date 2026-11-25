import { expect, test } from 'bun:test'

import { sceneNodeToDesignDocument, type DesignElement } from '@pairdraw/dom-css/export'
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

function background(nodeId: string, graph: SceneGraph): unknown {
  const root = sceneNodeToDesignDocument(graph, nodeId).children[0] as DesignElement
  return root.inlineStyle?.['background-color']
}

test('a Display P3 document projects its fill as the P3 color the canvas draws', () => {
  const { graph, rectId } = card('display-p3')
  expect(background(rectId, graph)).toBe('color(display-p3 0.8 0.4 0.3)')
})

test('an sRGB document keeps writing the same hex', () => {
  const { graph, rectId } = card('srgb')
  expect(background(rectId, graph)).toBe('#CC664D')
})
