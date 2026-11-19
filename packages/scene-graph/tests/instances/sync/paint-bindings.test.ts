import { expect, test } from 'bun:test'

import { SceneGraph, type Stroke } from '@pairdraw/scene-graph'
import { colorToFill } from '@pairdraw/scene-graph/color'
import { setInstanceOverride } from '@pairdraw/scene-graph/instances/overrides'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { reconcileVariableBindings } from '@pairdraw/scene-graph/variables'

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}`)
  return value
}

const paint = (color: Color): Stroke => ({ ...colorToFill(color), weight: 1, align: 'INSIDE' })

test.each(['fills', 'strokes'] as const)(
  'syncing an outer instance keeps the literal %s it sets on a nested layer unbound',
  (list) => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const collection = graph.createCollection('Theme')
    const gray = { r: 0.5, g: 0.5, b: 0.5, a: 1 }
    const tone = graph.createVariable('Gray', 'COLOR', collection.id, gray)
    const inner = graph.createNode('COMPONENT', page, { name: 'Inner' })
    const shape = graph.createNode('RECTANGLE', inner.id, { name: 'Shape', [list]: [paint(gray)] })
    graph.bindVariable(shape.id, `${list}/0/color`, tone.id)
    const outer = graph.createNode('COMPONENT', page, { name: 'Outer' })
    must(graph.createInstance(inner.id, outer.id), 'inner in outer')
    const placed = must(graph.createInstance(outer.id, page), 'placed outer')
    const nested = () =>
      must(graph.getChildren(must(graph.getChildren(placed.id)[0], 'nested inner').id)[0], 'shape')
    const literal = [paint({ r: 0.1, g: 0.2, b: 0.3, a: 1 })]
    // The outer instance claims the shape's paints; the shape itself binds nothing.
    graph.updateNode(nested().id, { [list]: literal, boundVariables: {} })
    setInstanceOverride(placed.instanceOverrides, placed.id, nested().id, list, literal)

    graph.syncInstance(placed.id)

    expect(nested().boundVariables).toEqual({})
    reconcileVariableBindings(graph)
    expect(nested()[list][0].color).toEqual(literal[0].color)
  }
)