import { describe, expect, test } from 'bun:test'

import { computeLayout } from '@pairdraw/core/layout'
import { SceneGraph } from '@pairdraw/scene-graph'
import { liveYogaNodeCount } from '#core/layout/yoga-helpers'

/** A vertical auto-layout chain `depth` frames deep, with one rectangle at its end. */
function nested(depth: number) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const outer = graph.createNode('FRAME', page.id, {
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    name: 'Outer',
    layoutMode: 'VERTICAL'
  })
  let parent = outer.id
  for (let i = 0; i < depth; i++) {
    parent = graph.createNode('FRAME', parent, {
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      name: `Frame ${i}`,
      layoutMode: 'VERTICAL'
    }).id
  }
  const leaf = graph.createNode('RECTANGLE', parent, {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    name: 'Leaf'
  })
  return { graph, outer: outer.id, leaf: leaf.id }
}

describe('layout depth limit', () => {
  test('lays out a chain far deeper than any document nests', () => {
    const { graph, outer, leaf } = nested(100)

    expect(() => computeLayout(graph, outer)).not.toThrow()
    expect(graph.getNode(leaf)?.y).toBeGreaterThanOrEqual(0)
  })

  // Past roughly 150 nested frames Yoga overruns its WebAssembly stack. The call then throws an
  // out-of-bounds memory error and leaves the shared Yoga instance unusable, so every later layout
  // in the process fails too. The pass is refused before that call instead.
  test('refuses a deeper chain with a clear error, and keeps laying out afterwards', () => {
    const deep = nested(400)
    expect(() => computeLayout(deep.graph, deep.outer)).toThrow(
      /nest more than \d+ auto-layout frames deep/
    )

    const shallow = nested(2)
    expect(() => computeLayout(shallow.graph, shallow.outer)).not.toThrow()
    expect(shallow.graph.getNode(shallow.leaf)?.y).toBeGreaterThanOrEqual(0)
  })

  test('frees the Yoga nodes it built when it refuses a deeper chain', () => {
    const before = liveYogaNodeCount()
    const deep = nested(400)
    expect(() => computeLayout(deep.graph, deep.outer)).toThrow(
      /nest more than \d+ auto-layout frames deep/
    )
    // The refused pass built part of its tree before the depth check fired; every node of it is
    // freed on the way out, so attempts cannot accumulate Yoga memory.
    expect(liveYogaNodeCount()).toBe(before)
  })
})
