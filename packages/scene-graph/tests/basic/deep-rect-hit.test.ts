import { describe, expect, test } from 'bun:test'

import { SceneGraph, type NodeType, type SceneNode } from '@open-pencil/scene-graph'
import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'
import { hitTestDeepInRect } from '@open-pencil/scene-graph/hit-test'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import { expectDefined } from '../helpers/assert'
import { pageId } from './helpers'

// A ⌘ marquee in Figma selects the deepest layers it touches, by the rules a ⌘ click follows.

const FILL = [
  { type: 'SOLID' as const, color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
]

function scene() {
  const graph = new SceneGraph()
  const page = pageId(graph)
  const add = (type: NodeType, name: string, parent: string, props: Partial<SceneNode>) =>
    graph.createNode(type, parent, { name, fills: FILL, ...props })
  const board = add('FRAME', 'Board', page, { width: 400, height: 400 })
  const card = add('FRAME', 'Card', board.id, { x: 100, y: 100, width: 200, height: 200 })
  const title = add('TEXT', 'Title', card.id, { x: 20, y: 20, width: 60, height: 20 })
  const icon = add('RECTANGLE', 'Icon', card.id, { x: 120, y: 120, width: 40, height: 40 })
  const group = add('GROUP', 'Group', board.id, { x: 10, y: 10, width: 60, height: 60, fills: [] })
  const dot = add('ELLIPSE', 'Dot', group.id, { width: 20, height: 20 })
  const select = (rect: Rect, scopeId = page) =>
    hitTestDeepInRect(graph, rect, scopeId)
      .map((node) => node.name)
      .toSorted()
  return { graph, page, board, card, title, icon, group, dot, select }
}

describe('hitTestDeepInRect', () => {
  test('selects the deepest layers the rect touches, not their containers', () => {
    const { select } = scene()
    expect(select({ x: 0, y: 0, width: 400, height: 400 })).toEqual(['Dot', 'Icon', 'Title'])
  })

  test('selects a painted container where it touches none of its layers, never a board', () => {
    const { select } = scene()
    expect(select({ x: 160, y: 200, width: 40, height: 10 })).toEqual(['Card'])
    expect(select({ x: 320, y: 20, width: 60, height: 40 })).toEqual([])
  })

  test("selects a group by its box, as a ⌘ click on the group's empty area does", () => {
    const { select } = scene()
    expect(select({ x: 50, y: 50, width: 10, height: 10 })).toEqual(['Group'])
  })

  test('selects a top-level auto layout frame by the empty area it owns', () => {
    const { graph, board, select } = scene()
    graph.updateNode(board.id, { layoutMode: 'VERTICAL' })
    expect(select({ x: 320, y: 20, width: 60, height: 40 })).toEqual(['Board'])
  })

  test('stays inside the scope', () => {
    const { card, select } = scene()
    expect(select({ x: 0, y: 0, width: 400, height: 400 }, card.id)).toEqual(['Icon', 'Title'])
  })

  test('skips hidden, locked, and internal layers with their contents', () => {
    const { graph, card, title, group, select } = scene()
    graph.updateNode(title.id, { visible: false })
    graph.updateNode(group.id, { locked: true })
    expect(select({ x: 0, y: 0, width: 400, height: 400 })).toEqual(['Icon'])
    graph.updateNode(card.id, { internalOnly: true })
    expect(select({ x: 0, y: 0, width: 400, height: 400 })).toEqual([])
  })

  test('meets the layers of a clipping container only inside it', () => {
    const { graph, card, icon, select } = scene()
    graph.updateNode(card.id, { clipsContent: true })
    // Past the card's right edge, which is at x 300 on the canvas.
    graph.updateNode(icon.id, { x: 240 })
    expect(select({ x: 320, y: 200, width: 40, height: 80 })).toEqual([])
    graph.updateNode(card.id, { clipsContent: false })
    expect(select({ x: 320, y: 200, width: 40, height: 80 })).toEqual(['Icon'])
  })

  test('keeps a boolean whole', () => {
    const graph = new SceneGraph()
    const page = pageId(graph)
    const union = graph.createNode('BOOLEAN_OPERATION', page, {
      name: 'Union',
      width: 100,
      height: 100
    })
    graph.createNode('RECTANGLE', union.id, { width: 60, height: 60 })
    expect(
      hitTestDeepInRect(graph, { x: -10, y: -10, width: 60, height: 60 }, page).map((n) => n.name)
    ).toEqual(['Union'])
  })

  test('reaches into instances and components', () => {
    const graph = new SceneGraph()
    const page = pageId(graph)
    const component = graph.createNode('COMPONENT', page, { width: 200, height: 100 })
    graph.createNode('TEXT', component.id, { name: 'Label', x: 10, y: 10, width: 50, height: 20 })
    const instance = graph.createNode('INSTANCE', page, { y: 200, width: 200, height: 100 })
    graph.createNode('TEXT', instance.id, { name: 'Copy', x: 10, y: 10, width: 50, height: 20 })
    expect(
      hitTestDeepInRect(graph, { x: 0, y: 0, width: 40, height: 240 }, page).map((n) => n.name)
    ).toEqual(['Label', 'Copy'])
  })

  test('places layers inside rotated containers where they are drawn', () => {
    const { graph, board, icon, select } = scene()
    graph.updateNode(board.id, { rotation: 90 })
    graph.updateNode(icon.id, { rotation: 30 })
    const drawn = getAxisAlignedWorldBounds(expectDefined(graph.getNode(icon.id)), graph)
    // Its drawn box, a quarter turn away from where the unrotated board would put it.
    expect(drawn.x).toBeLessThan(200)
    expect(select({ x: drawn.x + 1, y: drawn.y + 1, width: 2, height: 2 })).toContain('Icon')
    expect(select({ x: 220, y: 220, width: 40, height: 40 })).not.toContain('Icon')
  })
})
