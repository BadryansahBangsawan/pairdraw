import type { Fill, SceneGraph } from '@pairdraw/scene-graph'

/** Scenes for click-depth specs, built in the browser on the editor's graph. */

function fill(r: number, g: number, b: number): Fill[] {
  return [{ type: 'SOLID', color: { r, g, b, a: 1 }, opacity: 1, visible: true }]
}

/** A top-level card with auto layout and one without, each holding a title and a button. */
export function createClickDepthCards(graph: SceneGraph, pageId: string) {
  const card = (name: string, x: number, layoutMode: 'VERTICAL' | 'NONE') => {
    const frame = graph.createNode('FRAME', pageId, {
      name,
      x,
      y: 100,
      width: 200,
      height: 240,
      fills: fill(1, 1, 1),
      layoutMode,
      itemSpacing: 24,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24
    })
    graph.createNode('RECTANGLE', frame.id, {
      name: `${name} title`,
      x: 24,
      y: 24,
      width: 152,
      height: 40,
      fills: fill(0.85, 0.85, 0.9)
    })
    graph.createNode('RECTANGLE', frame.id, {
      name: `${name} button`,
      x: 24,
      y: 88,
      width: 152,
      height: 40,
      fills: fill(0.2, 0.4, 1)
    })
    return frame.id
  }
  return { auto: card('Auto card', 100, 'VERTICAL'), plain: card('Plain card', 400, 'NONE') }
}

/** A top-level board holding a grid, a cell, and a label, one inside the other. */
export function createNestedBoard(graph: SceneGraph, pageId: string) {
  const board = graph.createNode('FRAME', pageId, {
    name: 'Board',
    x: 100,
    y: 100,
    width: 300,
    height: 300,
    fills: fill(1, 1, 1)
  })
  const grid = graph.createNode('FRAME', board.id, {
    name: 'Grid',
    x: 20,
    y: 20,
    width: 260,
    height: 260,
    fills: fill(0.95, 0.95, 0.95)
  })
  const cell = graph.createNode('FRAME', grid.id, {
    name: 'Cell',
    x: 40,
    y: 40,
    width: 80,
    height: 80,
    fills: fill(0.1, 0.1, 0.1)
  })
  const label = graph.createNode('RECTANGLE', cell.id, {
    name: 'Label',
    x: 20,
    y: 20,
    width: 40,
    height: 40,
    fills: fill(1, 1, 1)
  })
  return { grid: grid.id, cell: cell.id, label: label.id }
}

/**
 * A section holding a top-level frame with a nested frame: `a` sits in the nested frame, `c`
 * directly in the top-level frame. Both are selected and cleared, so their layer rows are open.
 */
export function createScopeTree(graph: SceneGraph, pageId: string) {
  const grey = fill(0.9, 0.9, 0.9)
  const section = graph.createNode('SECTION', pageId, {
    name: 'Section',
    width: 500,
    height: 400,
    fills: grey
  })
  const top = graph.createNode('FRAME', section.id, {
    name: 'Top',
    x: 40,
    y: 40,
    width: 400,
    height: 300,
    fills: grey
  })
  const inner = graph.createNode('FRAME', top.id, {
    name: 'Inner',
    x: 40,
    y: 40,
    width: 300,
    height: 200,
    fills: grey
  })
  const a = graph.createNode('RECTANGLE', inner.id, {
    name: 'A',
    x: 40,
    y: 40,
    width: 60,
    height: 60,
    fills: grey
  })
  const c = graph.createNode('RECTANGLE', top.id, {
    name: 'C',
    x: 20,
    y: 260,
    width: 30,
    height: 30,
    fills: grey
  })
  return { inner: inner.id, a: a.id, c: c.id }
}
