import { describe, expect, test } from 'bun:test'

import { createSmartAnimation, easingAt, easingCSS, matchLayers } from '@pairdraw/core/prototype'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

function solid(r: number, g: number, b: number) {
  return {
    type: 'SOLID' as const,
    color: { r, g, b, a: 1 },
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL' as const
  }
}

/** Two screens side by side on one page, as a prototype navigates between them. */
function screens() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const a = graph.createNode('FRAME', pageId, { name: 'A', x: 0, y: 0, width: 400, height: 300 })
  const b = graph.createNode('FRAME', pageId, { name: 'B', x: 600, y: 0, width: 400, height: 300 })
  const add = (parentId: string, name: string, fields: Partial<SceneNode> = {}) =>
    graph.createNode(fields.type ?? 'RECTANGLE', parentId, { name, ...fields })
  return { graph, a, b, add }
}

function nameOf(graph: SceneGraph, id: string): string {
  return graph.getNode(id)?.name ?? id
}

function names(graph: SceneGraph, ids: readonly string[]): string[] {
  return ids.map((id) => nameOf(graph, id))
}

describe('easing curves', () => {
  test("follow Figma's presets from start to end", () => {
    expect(easingAt('LINEAR', 0.3)).toBeCloseTo(0.3, 6)
    // cubic-bezier(0.42, 0, 1, 1) at x = 0.5, solved to 200 bisection steps: 0.315357.
    expect(easingAt('EASE_IN', 0.5)).toBeCloseTo(0.315357, 5)
    // cubic-bezier(0, 0, 0.58, 1) at x = 0.5: 0.684643.
    expect(easingAt('EASE_OUT', 0.5)).toBeCloseTo(0.684643, 5)
    // cubic-bezier(0.42, 0, 0.58, 1) is symmetric about the middle, and 0.129162 a quarter in.
    expect(easingAt('EASE_IN_AND_OUT', 0.5)).toBeCloseTo(0.5, 6)
    expect(easingAt('EASE_IN_AND_OUT', 0.25)).toBeCloseTo(0.129162, 5)
    for (const easing of ['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_AND_OUT'] as const) {
      expect(easingAt(easing, 0)).toBe(0)
      expect(easingAt(easing, 1)).toBe(1)
      expect(easingAt(easing, -1)).toBe(0)
      expect(easingAt(easing, 2)).toBe(1)
    }
  })

  test('ease out without one, and read as CSS the same way', () => {
    expect(easingAt(undefined, 0.5)).toBe(easingAt('EASE_OUT', 0.5))
    expect(easingCSS(undefined)).toBe('cubic-bezier(0, 0, 0.58, 1)')
    expect(easingCSS('EASE_IN_AND_OUT')).toBe('cubic-bezier(0.42, 0, 0.58, 1)')
    expect(easingCSS('LINEAR')).toBe('linear')
  })
})

describe('matching layers between two frames', () => {
  test('pairs layers with the same name at the same place in the hierarchy', () => {
    const { graph, a, b, add } = screens()
    const cardA = add(a.id, 'Card', { type: 'FRAME' })
    add(cardA.id, 'Title')
    add(a.id, 'Title')
    const cardB = add(b.id, 'Card', { type: 'FRAME' })
    add(cardB.id, 'Title')
    add(b.id, 'Footer')

    const match = matchLayers(graph, a.id, graph, b.id)

    expect(match.pairs.map(({ from, to }) => [from, to].map((id) => nameOf(graph, id)))).toEqual([
      ['Card', 'Card'],
      ['Title', 'Title']
    ])
    expect(graph.getNode(match.pairs[1]?.from ?? '')?.parentId).toBe(cardA.id)
    // The top-level Title has a namesake only inside Card, which is another place.
    expect(names(graph, match.leaving)).toEqual(['Title'])
    expect(names(graph, match.entering)).toEqual(['Footer'])
  })

  test('pairs layers that share a name in the order they come', () => {
    const { graph, a, b, add } = screens()
    const first = add(a.id, 'Dot')
    const second = add(a.id, 'Dot')
    const one = add(b.id, 'Dot')
    const two = add(b.id, 'Dot')
    const three = add(b.id, 'Dot')

    const match = matchLayers(graph, a.id, graph, b.id)

    expect(match.pairs).toEqual([
      { from: first.id, to: one.id },
      { from: second.id, to: two.id }
    ])
    expect(match.entering).toEqual([three.id])
  })

  test('fades a group whose namesake is not there with all it holds, and only names it', () => {
    const { graph, a, b, add } = screens()
    const group = add(a.id, 'Menu', { type: 'FRAME' })
    add(group.id, 'Item')
    add(b.id, 'Item')

    const match = matchLayers(graph, a.id, graph, b.id)

    expect(match.pairs).toEqual([])
    expect(match.leaving).toEqual([group.id])
    expect(names(graph, match.entering)).toEqual(['Item'])
  })

  test('crossfades a hidden layer, another kind of layer, and changed text', () => {
    const { graph, a, b, add } = screens()
    add(a.id, 'Badge', { visible: false })
    add(b.id, 'Badge')
    add(a.id, 'Icon', { type: 'ELLIPSE' })
    add(b.id, 'Icon', { type: 'RECTANGLE' })
    add(a.id, 'Label', { type: 'TEXT', text: 'Buy' })
    add(b.id, 'Label', { type: 'TEXT', text: 'Bought' })
    add(a.id, 'Price', { type: 'TEXT', text: '$5' })
    add(b.id, 'Price', { type: 'TEXT', text: '$5', x: 40 })

    const match = matchLayers(graph, a.id, graph, b.id)

    expect(match.pairs.map(({ to }) => nameOf(graph, to))).toEqual(['Price'])
    expect(names(graph, match.leaving)).toEqual(['Badge', 'Icon', 'Label'])
    expect(names(graph, match.entering)).toEqual(['Badge', 'Icon', 'Label'])
  })

  test('pairs a frame with an instance of the same name, as both hold layers', () => {
    const { graph, a, b, add } = screens()
    const main = graph.createNode('COMPONENT', graph.getPages()[0].id, { name: 'Chip', y: 600 })
    add(main.id, 'Dot')
    const frame = add(a.id, 'Chip', { type: 'FRAME' })
    add(frame.id, 'Dot')
    const instance = graph.createInstance(main.id, b.id)
    if (!instance) throw new Error('no instance')

    const match = matchLayers(graph, a.id, graph, b.id)

    expect(match.pairs.map(({ to }) => nameOf(graph, to))).toEqual(['Chip', 'Dot'])
    expect(match.pairs[0]?.to).toBe(instance.id)
  })
})

describe('a Smart animate between two frames', () => {
  function cardMoves() {
    const { graph, a, b, add } = screens()
    const from = add(a.id, 'Card', {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 1,
      cornerRadius: 0,
      fills: [solid(1, 0, 0)]
    })
    const to = add(b.id, 'Card', {
      x: 110,
      y: 220,
      width: 200,
      height: 150,
      rotation: 90,
      opacity: 0.5,
      cornerRadius: 20,
      fills: [solid(0, 0, 1)]
    })
    return { graph, a, b, add, from, to }
  }

  test("draws the destination frame with each matched layer at the start frame's values first", () => {
    const { graph, a, b, from, to } = cardMoves()

    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )
    animation.seek(0)
    const card = animation.graph.getNode(to.id)

    expect(animation.rootId).toBe(b.id)
    expect(card).toMatchObject({
      x: from.x,
      y: from.y,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 1,
      cornerRadius: 0
    })
    expect(card?.fills[0]?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  test('moves each property along the easing, and ends at the destination', () => {
    const { graph, a, b, to } = cardMoves()
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    animation.seek(0.25)
    const card = animation.graph.getNode(to.id)
    expect(card).toMatchObject({
      x: 35,
      y: 70,
      width: 125,
      height: 75,
      rotation: 22.5,
      opacity: 0.875,
      cornerRadius: 5
    })
    expect(card?.fills[0]?.color).toEqual({ r: 0.75, g: 0, b: 0.25, a: 1 })

    animation.seek(1)
    expect(animation.graph.getNode(to.id)).toMatchObject({
      x: 110,
      y: 220,
      width: 200,
      height: 150,
      rotation: 90,
      opacity: 0.5,
      cornerRadius: 20
    })
    expect(animation.graph.getNode(to.id)?.fills[0]?.color).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  })

  test('eases the way the transition asks', () => {
    const { graph, a, b, to } = cardMoves()
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'EASE_IN'
    )

    animation.seek(0.5)

    // 10 → 110 at ease-in 0.315357 of the way.
    expect(animation.graph.getNode(to.id)?.x).toBeCloseTo(10 + 100 * 0.315357, 3)
  })

  test("fades out the start frame's layers that have no match, and fades in the destination's", () => {
    const { graph, a, b, add } = cardMoves()
    const toast = add(a.id, 'Toast', { x: 5, y: 6, opacity: 0.8 })
    const banner = add(b.id, 'Banner', { opacity: 0.6 })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    animation.seek(0)
    const leaving = animation.graph
      .getChildren(b.id)
      .find((child) => child.name === 'Toast' && child.id !== toast.id)
    expect(leaving).toMatchObject({ x: 5, y: 6, opacity: 0.8 })
    expect(animation.graph.getNode(banner.id)?.opacity).toBe(0)

    animation.seek(0.5)
    expect(animation.graph.getNode(leaving?.id ?? '')?.opacity).toBeCloseTo(0.4, 6)
    expect(animation.graph.getNode(banner.id)?.opacity).toBeCloseTo(0.3, 6)

    animation.seek(1)
    expect(animation.graph.getNode(leaving?.id ?? '')?.opacity).toBe(0)
    expect(animation.graph.getNode(banner.id)?.opacity).toBeCloseTo(0.6, 6)
  })

  test('carries a leaving layer with what it holds, under the layer its parent matched', () => {
    const { graph, a, b, add } = screens()
    const listA = add(a.id, 'List', { type: 'FRAME' })
    const row = add(listA.id, 'Row', { type: 'FRAME' })
    add(row.id, 'Text', { type: 'TEXT', text: 'Hi' })
    const listB = add(b.id, 'List', { type: 'FRAME', y: 50 })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    const [copy] = animation.graph.getChildren(listB.id)
    expect(copy?.name).toBe('Row')
    expect(copy?.id).not.toBe(row.id)
    expect(animation.graph.getChildren(copy?.id ?? '').map((child) => child.name)).toEqual(['Text'])
  })

  test('changes neither frame it animates between', () => {
    const { graph, a, b, add, from, to } = cardMoves()
    add(a.id, 'Toast')
    const before = structuredClone([...graph.getAllNodes()])
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    animation.seek(0.5)

    expect(structuredClone([...graph.getAllNodes()])).toEqual(before)
    expect(graph.getChildren(b.id).map((child) => child.id)).toEqual([to.id])
    expect(graph.getNode(from.id)?.x).toBe(10)
  })

  test("animates the destination frame's own fill, and keeps its place and size", () => {
    const { graph, a, b } = screens()
    graph.updateNode(a.id, { fills: [solid(0, 0, 0)] })
    graph.updateNode(b.id, { fills: [solid(1, 1, 1)] })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    animation.seek(0.5)

    expect(animation.graph.getNode(b.id)).toMatchObject({ x: 600, y: 0, width: 400, height: 300 })
    expect(animation.graph.getNode(b.id)?.fills[0]?.color).toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
  })

  test('marks what a step redraws, and counts each step', () => {
    const { graph, a, b, add, to } = cardMoves()
    const still = add(a.id, 'Logo')
    add(b.id, 'Logo')
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )
    const revision = animation.revision

    animation.seek(0.5)

    expect(animation.revision).toBe(revision + 1)
    expect(animation.touched.has(to.id)).toBe(true)
    expect(animation.touched.has(b.id)).toBe(true)
    expect(animation.touched.has(still.id)).toBe(false)
  })

  test('writes only the layers that change, so a large frame with one moving layer stays cheap', () => {
    const { graph, a, b, add } = screens()
    for (let index = 0; index < 200; index++) {
      add(a.id, `Layer ${index}`, { x: index })
      add(b.id, `Layer ${index}`, { x: index })
    }
    add(a.id, 'Mover', { x: 0 })
    const mover = add(b.id, 'Mover', { x: 100 })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )
    const written = new Set<string>()
    animation.graph.onNodeEvents({
      updated: (id: string) => {
        written.add(id)
      }
    })

    for (let frame = 0; frame <= 60; frame++) animation.seek(frame / 60)

    expect([...written]).toEqual([mover.id])
  })

  test('turns rotation the short way across ±180', () => {
    const { graph, a, b, add } = screens()
    add(a.id, 'Arrow', { rotation: 170 })
    const arrow = add(b.id, 'Arrow', { rotation: -170 })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )

    animation.seek(0.5)

    // 20° apart: the midpoint is ±180, not 0 after a 340° spin the long way.
    expect(Math.abs(animation.graph.getNode(arrow.id)?.rotation ?? Number.NaN)).toBeCloseTo(180, 6)
    animation.seek(1)
    expect(animation.graph.getNode(arrow.id)?.rotation).toBeCloseTo(-170, 6)
  })

  test('leaves layers hidden in both frames alone: no tracks, no writes', () => {
    const { graph, a, b, add } = screens()
    for (let index = 0; index < 50; index++) {
      add(a.id, `Hint ${index}`, { visible: false })
      add(b.id, `Hint ${index}`, { visible: false })
    }
    add(a.id, 'Card', { x: 0 })
    const card = add(b.id, 'Card', { x: 100 })
    const animation = createSmartAnimation(
      { graph, rootId: a.id },
      { graph, rootId: b.id },
      'LINEAR'
    )
    let writes = 0
    const stop = animation.graph.onNodeEvents({
      updated: () => {
        writes += 1
      }
    })

    animation.seek(0.5)
    stop()

    expect([...animation.touched].sort()).toEqual([card.id, b.id].sort())
    expect(writes).toBe(1)
  })
})
