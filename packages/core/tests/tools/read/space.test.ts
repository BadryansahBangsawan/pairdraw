import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

import { findEmptySpace } from '#core/tools/read/space'

const findEmptySpaceTool = ALL_TOOLS.find((tool) => tool.name === 'find_empty_space')
if (!findEmptySpaceTool) throw new Error('find_empty_space tool missing')

type SpaceResult = { x?: number; y?: number; direction?: string; error?: string }

function run(figma: FigmaAPI, args: Record<string, unknown>): SpaceResult {
  return findEmptySpaceTool?.execute(figma, args) as SpaceResult
}

function page() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const frame = (name: string, x: number, y: number, width: number, height: number) =>
    graph.createNode('FRAME', figma.currentPage.id, { name, x, y, width, height })
  return { graph, figma, frame }
}

describe('findEmptySpace', () => {
  test('an empty parent places content at the origin', () => {
    expect(
      findEmptySpace({
        obstacles: [],
        width: 50,
        height: 50,
        anchor: null,
        gap: 10,
        directions: ['right']
      })
    ).toEqual({ x: 0, y: 0, width: 50, height: 50, direction: null })
  })

  test('skips past an obstacle in the row to the right of the anchor', () => {
    const anchor = { x: 0, y: 0, width: 100, height: 100 }
    const blocker = { x: 120, y: 20, width: 100, height: 40 }
    const space = findEmptySpace({
      obstacles: [anchor, blocker],
      width: 80,
      height: 80,
      anchor,
      gap: 10,
      directions: ['right']
    })
    expect(space).toMatchObject({ x: 230, y: 0, direction: 'right' })
  })

  test('takes the nearest side when several are allowed', () => {
    const anchor = { x: 0, y: 0, width: 100, height: 100 }
    const right = { x: 110, y: 0, width: 400, height: 100 }
    const space = findEmptySpace({
      obstacles: [anchor, right],
      width: 50,
      height: 50,
      anchor,
      gap: 10,
      directions: ['right', 'below', 'left', 'above']
    })
    expect(space).toMatchObject({ x: 0, y: 110, direction: 'below' })
  })
})

describe('find_empty_space tool', () => {
  test('finds room beside everything on the page by default', () => {
    const { figma, frame } = page()
    frame('A', 0, 0, 200, 100)
    frame('B', 300, 0, 100, 300)
    expect(run(figma, { width: 120, height: 80 })).toMatchObject({
      x: 500,
      y: 0,
      direction: 'right'
    })
  })

  test('finds room next to one layer, below it when asked', () => {
    const { figma, frame } = page()
    const a = frame('A', 0, 0, 200, 100)
    frame('Under', 0, 150, 200, 100)
    expect(
      run(figma, { width: 100, height: 40, near_id: a.id, direction: 'below', gap: 20 })
    ).toMatchObject({ x: 0, y: 270, direction: 'below' })
  })

  test('places on an empty page at the origin', () => {
    const { figma } = page()
    expect(run(figma, { width: 10, height: 10 })).toMatchObject({ x: 0, y: 0 })
  })

  test('reports a missing layer and an auto layout parent', () => {
    const { graph, figma, frame } = page()
    expect(run(figma, { width: 10, height: 10, near_id: '9:9' })).toEqual({
      error: 'Node "9:9" not found'
    })
    const stack = frame('Stack', 0, 0, 100, 100)
    graph.updateNode(stack.id, { layoutMode: 'VERTICAL' })
    expect(run(figma, { width: 10, height: 10, parent_id: stack.id }).error).toContain(
      'auto layout'
    )
  })
})
