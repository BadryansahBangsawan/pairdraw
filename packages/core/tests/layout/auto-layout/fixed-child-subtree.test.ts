import { describe, expect, test } from 'bun:test'

import { computeAllLayouts, computeLayout } from '@pairdraw/core/layout'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { yogaNodeCreationCount } from '#core/layout/yoga-helpers'

/**
 * A vertical card of twenty fixed-size vertical sections, ten rectangles each: the shape of a
 * dashboard card whose sections keep their own sizes while the card's padding moves them.
 */
function card(): { graph: SceneGraph; card: SceneNode } {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Card',
    x: 0,
    y: 0,
    width: 320,
    height: 400,
    layoutMode: 'VERTICAL',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    itemSpacing: 8
  })
  for (let section = 0; section < 20; section++) {
    const row = graph.createNode('FRAME', frame.id, {
      name: `Section ${section}`,
      width: 288,
      height: 20,
      layoutMode: 'VERTICAL',
      itemSpacing: 4
    })
    for (let cell = 0; cell < 10; cell++) {
      graph.createNode('RECTANGLE', row.id, {
        name: `Cell ${section}-${cell}`,
        width: 288,
        height: 16
      })
    }
  }
  return { graph, card: frame }
}

describe('a layout pass over fixed-size auto layout children', () => {
  test('builds only the layers it places, and places them as before', () => {
    const { graph, card: frame } = card()
    computeAllLayouts(graph)
    const sections = graph.getChildren(frame.id)
    const cells = graph.getChildren(sections[0].id).map((cell) => ({ ...cell }))

    const before = yogaNodeCreationCount()
    graph.updateNode(frame.id, { paddingLeft: 24 })
    computeLayout(graph, frame.id)
    const built = yogaNodeCreationCount() - before

    // The sections' own sizes are all this pass needs; their 200 cells keep their places.
    expect(built).toBeLessThanOrEqual(32)
    expect(sections[0]).toMatchObject({ x: 24, y: 16 })
    expect(graph.getChildren(sections[0].id).map((cell) => [cell.x, cell.y])).toEqual(
      cells.map((cell) => [cell.x, cell.y])
    )
  })
})
