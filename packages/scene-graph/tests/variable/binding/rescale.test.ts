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

/** A text whose characters bind a spacing, and whose layer optionally binds one too. */
function rescaledText(options: { layerSpacing?: boolean; layerWidth?: boolean } = {}) {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Type')
  const spacing = graph.createVariable('Spacing', 'FLOAT', collection.id, 2)
  const width = graph.createVariable('Width', 'FLOAT', collection.id, 100)
  const page = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', page, { width: 200, height: 100 })
  const boundVariables: Record<string, string> = {}
  if (options.layerSpacing) boundVariables.letterSpacing = spacing.id
  if (options.layerWidth) boundVariables.width = width.id
  const text = graph.createNode('TEXT', frame.id, {
    text: 'Hello',
    fontSize: 16,
    letterSpacing: { unit: 'PIXELS', value: 2 },
    boundVariables,
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          letterSpacing: { unit: 'PIXELS', value: 2 },
          boundVariables: { letterSpacing: spacing.id }
        }
      }
    ]
  })
  return { graph, frame, text, spacing, width, collection }
}

function runSpacing(graph: SceneGraph, id: string) {
  const node = graph.getNode(id)
  if (!node) throw new Error(`Missing text ${id}`)
  return node.styleRuns[0]?.style.letterSpacing
}

test('unbinding the layer keeps the scale its characters still bind', () => {
  const { graph, frame, text } = rescaledText({ layerSpacing: true })
  rescaleNodeTree(graph, frame.id, 2)
  reconcileVariableBindings(graph)
  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })

  graph.unbindVariable(text.id, 'letterSpacing')
  reconcileVariableBindings(graph)

  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })
})

test('deleting another variable keeps the scale a run still binds', () => {
  const { graph, frame, text, width } = rescaledText({ layerWidth: true })
  rescaleNodeTree(graph, frame.id, 2)
  reconcileVariableBindings(graph)
  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })

  graph.removeVariable(width.id)
  reconcileVariableBindings(graph)

  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })
})

test('a run keeps the scale it was bound with over the layer’s', () => {
  const { graph, frame, text, spacing } = rescaledText({ layerSpacing: true })
  rescaleNodeTree(graph, frame.id, 2)
  reconcileVariableBindings(graph)

  // What a range bound after the rescale holds: its own scale, not the layer's older one.
  graph.updateNode(text.id, {
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          boundVariables: { letterSpacing: spacing.id },
          variableBindingScales: { letterSpacing: 1 }
        }
      }
    ]
  })
  reconcileVariableBindings(graph)

  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 2 })
})

test('a run saved before runs kept a scale keeps the layer’s once the layer unbinds', () => {
  const { graph, text, spacing } = rescaledText({ layerSpacing: true })
  // How a document saved before runs kept their own scale opens: the scale is on the layer only.
  graph.updateNode(text.id, {
    variableBindingScales: { letterSpacing: 2 },
    styleRuns: [{ start: 0, length: 5, style: { boundVariables: { letterSpacing: spacing.id } } }]
  })
  reconcileVariableBindings(graph)
  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })

  graph.unbindVariable(text.id, 'letterSpacing')
  reconcileVariableBindings(graph)

  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })
  expect(graph.getNode(text.id)?.styleRuns[0]?.style.variableBindingScales).toEqual({
    letterSpacing: 2
  })
})

test('binding the layer again keeps the scale a run resolved with', () => {
  const { graph, text, spacing, collection } = rescaledText({ layerSpacing: true })
  const wide = graph.createVariable('Wide', 'FLOAT', collection.id, 3)
  graph.updateNode(text.id, {
    variableBindingScales: { letterSpacing: 2 },
    styleRuns: [{ start: 0, length: 5, style: { boundVariables: { letterSpacing: spacing.id } } }]
  })

  graph.bindVariable(text.id, 'letterSpacing', wide.id)
  reconcileVariableBindings(graph)

  expect(runSpacing(graph, text.id)).toEqual({ unit: 'PIXELS', value: 4 })
})

test('a rescale keeps the values it scales on the runs it gives a scale', () => {
  const { graph, frame, text, spacing } = rescaledText()
  graph.updateNode(text.id, {
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          fontSize: 20,
          letterSpacing: { unit: 'PIXELS', value: 2 },
          boundVariables: { letterSpacing: spacing.id }
        }
      }
    ]
  })

  rescaleNodeTree(graph, frame.id, 2)

  const style = graph.getNode(text.id)?.styleRuns[0]?.style
  expect(style?.fontSize).toBe(40)
  expect(style?.variableBindingScales).toEqual({ letterSpacing: 2 })
})
