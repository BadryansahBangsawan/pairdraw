import { describe, expect, test } from 'bun:test'

import { SceneGraph, type GridTrack } from '@pairdraw/scene-graph'

const BAD_COLUMNS = [
  { sizing: 'FIXED', value: Number.NaN },
  { sizing: 'FR', value: 0 },
  { sizing: 'FR', value: Number.NaN },
  { sizing: 'AUTO', value: 12 },
  { sizing: 'FIXED', value: -30 },
  { sizing: 'FR', value: 2 }
] as const

const SAFE_COLUMNS: GridTrack[] = [
  { sizing: 'AUTO', value: 0 },
  { sizing: 'FR', value: 1 },
  { sizing: 'FR', value: 1 },
  { sizing: 'AUTO', value: 0 },
  { sizing: 'AUTO', value: 0 },
  { sizing: 'FR', value: 2 }
]

function frame(graph: SceneGraph) {
  const page = graph.getPages()[0].id
  return graph.createNode('FRAME', page, { name: 'Grid', width: 100, height: 100 })
}

describe('grid values a canvas cannot lay out', () => {
  test('a created grid gets safe gaps and tracks', () => {
    const graph = new SceneGraph()
    const created = graph.createNode('FRAME', graph.getPages()[0].id, {
      layoutMode: 'GRID',
      gridRowGap: Number.NaN,
      gridColumnGap: -6,
      gridTemplateColumns: [...BAD_COLUMNS]
    })

    expect(created.gridRowGap).toBe(0)
    expect(created.gridColumnGap).toBe(0)
    expect(created.gridTemplateColumns).toEqual(SAFE_COLUMNS)
  })

  test('an edited grid gets safe gaps and tracks', () => {
    const graph = new SceneGraph()
    const created = frame(graph)
    graph.updateNode(created.id, {
      layoutMode: 'GRID',
      gridRowGap: -1,
      gridColumnGap: Number.POSITIVE_INFINITY,
      gridTemplateColumns: [...BAD_COLUMNS]
    })
    const node = graph.getNode(created.id)

    expect(node?.gridRowGap).toBe(0)
    expect(node?.gridColumnGap).toBe(0)
    expect(node?.gridTemplateColumns).toEqual(SAFE_COLUMNS)
  })

  test('a resize keeps the values it is given', () => {
    const graph = new SceneGraph()
    const created = frame(graph)
    graph.updateNode(created.id, {
      layoutMode: 'GRID',
      gridTemplateColumns: [{ sizing: 'FIXED', value: 24 }],
      gridRowGap: 6
    })

    expect(graph.getNode(created.id)?.gridTemplateColumns).toEqual([
      { sizing: 'FIXED', value: 24 }
    ])
    expect(graph.getNode(created.id)?.gridRowGap).toBe(6)
  })
})
