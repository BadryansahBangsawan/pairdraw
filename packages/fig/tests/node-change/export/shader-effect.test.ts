import { describe, expect, test } from 'bun:test'

import { sceneNodeToKiwi } from '#fig/node-change/index'

import { SceneGraph } from '@pairdraw/scene-graph'

describe('shader effects in .fig export', () => {
  test('a node whose only effect is a visible shader effect exports without throwing', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('The fixture has no page')
    const node = graph.createNode('RECTANGLE', page.id, {
      name: 'Shaded',
      width: 40,
      height: 40,
      effects: [{ type: 'SHADER', source: 'void main() {}', visible: true }]
    })

    expect(() =>
      sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])
    ).not.toThrow()
  })
})
