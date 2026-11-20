import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

/** A component with a filled box, and an instance of it. */
function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const component = figma.createComponent()
  component.name = 'Card'
  component.resize(120, 80)
  component.fills = [
    { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1, visible: true, blendMode: 'NORMAL' }
  ]
  const instance = expectDefined(component.createInstance(), 'instance')
  const collection = graph.createCollection('Colors')
  const variable = graph.createVariable('Brand', 'COLOR', collection.id, { r: 0, g: 0, b: 1, a: 1 })
  const editor = createEditor({ graph, skipInitialGraphSetup: true })
  return { editor, graph, instance, variable }
}

test('a fill bound inside an instance is recorded as its override', () => {
  const { editor, graph, instance, variable } = setup()

  editor.bindVariable(instance.id, 'fills/0/color', variable.id)

  // The file keeps the fields an instance overrode; a bound fill is one of them, so the live
  // record has to name it too or reopening shows an override the document never had.
  expect([...expectDefined(graph.getNode(instance.id), 'instance').instanceOverrides.self.keys()])
    .toContain('fills')
})
