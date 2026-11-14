import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode, type Stroke } from '@pairdraw/scene-graph'

import { computeAllLayouts } from '#core/layout'

const BLACK = { r: 0, g: 0, b: 0, a: 1 }

function stroke(weight: number, align: Stroke['align']): Stroke {
  return { type: 'SOLID', color: BLACK, opacity: 1, visible: true, weight, align }
}

/**
 * A Hug row with padding 10 and gap 10 around two 40 × 20 rectangles, laid out with or without
 * strokes; each part takes the strokes given for it.
 */
function strokedRow(options: {
  included: boolean
  row?: Stroke[]
  children?: Stroke[]
  layoutMode?: SceneNode['layoutMode']
  rowFields?: Partial<SceneNode>
}) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const row = graph.createNode('FRAME', pageId, {
    layoutMode: options.layoutMode ?? 'HORIZONTAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    itemSpacing: 10,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    strokesIncludedInLayout: options.included,
    strokes: options.row ?? [],
    ...options.rowFields
  })
  const children = [0, 1].map((index) =>
    graph.createNode('RECTANGLE', row.id, {
      name: `child ${index}`,
      width: 40,
      height: 20,
      strokes: options.children ?? []
    })
  )
  computeAllLayouts(graph, pageId)
  const box = (node: SceneNode) => {
    const current = graph.getNode(node.id)
    return current ? [current.x, current.y, current.width, current.height] : []
  }
  return { row: () => box(row), first: () => box(children[0]), second: () => box(children[1]) }
}

describe('strokes included in auto layout', () => {
  test('are ignored while the frame leaves them out', () => {
    const scene = strokedRow({
      included: false,
      row: [stroke(4, 'INSIDE')],
      children: [stroke(3, 'OUTSIDE')]
    })
    expect(scene.row()).toEqual([0, 0, 110, 40])
    expect(scene.first()).toEqual([10, 10, 40, 20])
    expect(scene.second()).toEqual([60, 10, 40, 20])
  })

  test('push content inside the frame’s own inside stroke', () => {
    const scene = strokedRow({ included: true, row: [stroke(4, 'INSIDE')] })
    expect(scene.row()).toEqual([0, 0, 118, 48])
    expect(scene.first()).toEqual([14, 14, 40, 20])
  })

  test('count half of a centered stroke and none of an outside one on the frame', () => {
    expect(strokedRow({ included: true, row: [stroke(4, 'CENTER')] }).first()).toEqual([
      12, 12, 40, 20
    ])
    expect(strokedRow({ included: true, row: [stroke(4, 'OUTSIDE')] }).first()).toEqual([
      10, 10, 40, 20
    ])
  })

  test('give each child room for the stroke outside its box', () => {
    const scene = strokedRow({ included: true, children: [stroke(3, 'OUTSIDE')] })
    expect(scene.first()).toEqual([13, 13, 40, 20])
    expect(scene.second()).toEqual([69, 13, 40, 20])
    expect(scene.row()).toEqual([0, 0, 122, 46])
  })

  test('leave a child’s inside stroke to the child', () => {
    const scene = strokedRow({ included: true, children: [stroke(3, 'INSIDE')] })
    expect(scene.row()).toEqual([0, 0, 110, 40])
    expect(scene.second()).toEqual([60, 10, 40, 20])
  })

  test('use the frame’s own side weights', () => {
    const scene = strokedRow({
      included: true,
      row: [stroke(1, 'INSIDE')],
      rowFields: {
        independentStrokeWeights: true,
        borderTopWeight: 2,
        borderRightWeight: 0,
        borderBottomWeight: 6,
        borderLeftWeight: 8
      }
    })
    expect(scene.first()).toEqual([18, 12, 40, 20])
    expect(scene.row()).toEqual([0, 0, 118, 48])
  })

  test('skip hidden strokes', () => {
    const hidden = { ...stroke(4, 'INSIDE'), visible: false }
    expect(strokedRow({ included: true, row: [hidden] }).row()).toEqual([0, 0, 110, 40])
  })

  test('apply to a grid', () => {
    const scene = strokedRow({
      included: true,
      layoutMode: 'GRID',
      row: [stroke(4, 'INSIDE')],
      rowFields: {
        width: 200,
        height: 100,
        primaryAxisSizing: 'FIXED',
        counterAxisSizing: 'FIXED',
        gridTemplateColumns: [
          { sizing: 'FR', value: 1 },
          { sizing: 'FR', value: 1 }
        ],
        gridTemplateRows: [{ sizing: 'FR', value: 1 }]
      }
    })
    expect(scene.first().slice(0, 2)).toEqual([14, 14])
  })
})
