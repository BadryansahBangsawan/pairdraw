import type { Fill, SceneGraph, Stroke } from '@open-pencil/scene-graph'

const solid = (r: number, g: number, b: number): Fill[] => [
  { type: 'SOLID', color: { r, g, b, a: 1 }, opacity: 1, visible: true }
]

function stroke(weight: number, align: Stroke['align']): Stroke[] {
  return [
    {
      type: 'SOLID',
      color: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
      opacity: 1,
      visible: true,
      weight,
      align
    }
  ]
}

/**
 * Two Hug rows side by side, each with an 8 px inside stroke and children with a 6 px outside
 * stroke: the first leaves strokes out of its layout, so they overlap, and the second includes
 * them, so its content clears its own stroke and the children's.
 */
export function createStrokesInLayoutScene(graph: SceneGraph, pageId: string) {
  return [false, true].map((included, index) => {
    const row = graph.createNode('FRAME', pageId, {
      name: included ? 'Included' : 'Excluded',
      x: index * 260,
      y: 0,
      width: 200,
      height: 100,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
      itemSpacing: 4,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 4,
      paddingBottom: 4,
      strokesIncludedInLayout: included,
      fills: solid(1, 1, 1),
      strokes: stroke(8, 'INSIDE')
    })
    for (const name of ['A', 'B'])
      graph.createNode('RECTANGLE', row.id, {
        name,
        width: 60,
        height: 40,
        fills: solid(0.55, 0.75, 1),
        strokes: stroke(6, 'OUTSIDE')
      })
    return row.id
  })
}
