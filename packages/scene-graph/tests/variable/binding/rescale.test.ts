import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { rescaleNodeTree } from '@pairdraw/scene-graph/scaling'
import { reconcileVariableBindings } from '@pairdraw/scene-graph/variables'

test('a rescaled text keeps the scale on sizes its characters bind, and none on weights', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Type')
  const size = graph.createVariable('Size', 'FLOAT', collection.id, 16)
  const spacing = graph.createVariable('Spacing', 'FLOAT', collection.id, 2)
  const weight = graph.createVariable('Weight', 'FLOAT', collection.id, 700)
  const page = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', page, { width: 200, height: 100 })
  const runs = graph.createNode('TEXT', frame.id, {
    text: 'Hello',
    fontSize: 16,
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: { unit: 'PIXELS', value: 2 },
          boundVariables: { fontSize: size.id, letterSpacing: spacing.id, fontWeight: weight.id }
        }
      }
    ]
  })
  const whole = graph.createNode('TEXT', frame.id, {
    text: 'Hello',
    fontSize: 16,
    fontWeight: 700,
    boundVariables: { fontSize: size.id, fontWeight: weight.id }
  })

  rescaleNodeTree(graph, frame.id, 2)
  reconcileVariableBindings(graph)

  const style = graph.getNode(runs.id)?.styleRuns[0]?.style
  expect(style?.fontSize).toBe(32)
  expect(style?.letterSpacing).toEqual({ unit: 'PIXELS', value: 4 })
  expect(style?.fontWeight).toBe(700)
  expect(graph.getNode(whole.id)?.fontSize).toBe(32)
  expect(graph.getNode(whole.id)?.fontWeight).toBe(700)
})
