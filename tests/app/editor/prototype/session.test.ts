import { describe, expect, test } from 'bun:test'

import { SceneGraph, type PrototypeReaction } from '@open-pencil/scene-graph'

import {
  reactionAt,
  restartSession,
  startFrame,
  startSession,
  step,
  topFrameOf
} from '@/app/editor/prototype/session'

function page(graph: SceneGraph) {
  return graph.getPages()[0].id
}

/** A page with two frames, the first holding a 100×100 rectangle with a click reaction. */
function fixture() {
  const graph = new SceneGraph()
  const root = page(graph)
  const first = graph.createNode('FRAME', root, { x: 0, y: 0, width: 300, height: 200 })
  const second = graph.createNode('FRAME', root, { x: 400, y: 0, width: 300, height: 200 })
  const button = graph.createNode('RECTANGLE', first.id, { x: 50, y: 50, width: 100, height: 100 })
  return { graph, first, second, button, root }
}

function navigatesTo(nodeId: string | null, navigation: 'NAVIGATE' | 'OVERLAY' = 'NAVIGATE') {
  return {
    id: `reaction-${nodeId}`,
    trigger: { type: 'ON_CLICK', delay: 0 },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation,
        transition: { type: 'INSTANT', duration: 0.3 },
        overlayPosition: 'CENTER'
      }
    ]
  } satisfies PrototypeReaction
}

function withReaction(graph: SceneGraph, id: string, reaction: PrototypeReaction) {
  graph.updateNode(id, { prototypeReactions: [reaction] })
}

describe('the frame play starts from', () => {
  test('is the selected frame', () => {
    const { graph, first, second } = fixture()
    expect(startFrame(graph, page(graph), new Set([second.id]))).toBe(second.id)
    expect(startFrame(graph, page(graph), new Set([first.id]))).toBe(first.id)
  })

  test('is the frame holding the selected layer', () => {
    const { graph, first, button } = fixture()
    expect(startFrame(graph, page(graph), new Set([button.id]))).toBe(first.id)
  })

  test('is the page’s first frame when nothing that sits in one is selected', () => {
    const { graph, first } = fixture()
    expect(startFrame(graph, page(graph), new Set())).toBe(first.id)
  })

  test('is nothing when the page has no frames', () => {
    const graph = new SceneGraph()
    expect(startFrame(graph, page(graph), new Set())).toBeNull()
  })
})

describe('the top frame of a layer', () => {
  test('skips the frames inside a page frame', () => {
    const { graph, first } = fixture()
    const inner = graph.createNode('FRAME', first.id, { x: 0, y: 0, width: 50, height: 50 })
    const leaf = graph.createNode('RECTANGLE', inner.id, { x: 0, y: 0, width: 10, height: 10 })
    expect(topFrameOf(graph, leaf)?.id).toBe(first.id)
  })

  test('is null for a layer on the page', () => {
    const { graph, root } = fixture()
    const orphan = graph.createNode('RECTANGLE', root, { x: 0, y: 0, width: 10, height: 10 })
    expect(topFrameOf(graph, orphan)).toBeNull()
  })
})

describe('a click in play', () => {
  test('runs the reaction of the layer under it', () => {
    const { graph, first, second, button } = fixture()
    withReaction(graph, button.id, navigatesTo(second.id))
    const click = reactionAt(graph, startSession(first.id), 100, 100)
    expect(click?.action).toMatchObject({ type: 'NODE', nodeId: second.id })
  })

  test('runs the reaction of the nearest ancestor with one', () => {
    const { graph, first, second, button } = fixture()
    withReaction(graph, first.id, navigatesTo(second.id))
    expect(reactionAt(graph, startSession(first.id), 100, 100)?.action).toMatchObject({
      nodeId: second.id
    })
    expect(button.id).toBeDefined()
  })

  test('is nothing over a layer with no reaction up to the played frame', () => {
    const { graph, first } = fixture()
    expect(reactionAt(graph, startSession(first.id), 100, 100)).toBeNull()
  })

  test('ignores clicks outside the played frame, and other frames’ layers', () => {
    const { graph, first, second } = fixture()
    withReaction(graph, second.id, navigatesTo(first.id))
    expect(reactionAt(graph, startSession(first.id), 500, 100)).toBeNull()
  })
})

describe('a step', () => {
  test('navigates to the target frame and remembers the one it left', () => {
    const { graph, first, second } = fixture()
    const shown = step(graph, startSession(first.id), {
      type: 'NODE',
      nodeId: second.id,
      navigation: 'NAVIGATE',
      transition: { type: 'INSTANT', duration: 0.3 },
      overlayPosition: 'CENTER'
    })
    expect(shown.frameId).toBe(second.id)
    expect(shown.history).toEqual([first.id])
  })

  test('goes back to the frame it left', () => {
    const { graph, first, second } = fixture()
    const there = step(graph, startSession(first.id), {
      type: 'NODE',
      nodeId: second.id,
      navigation: 'NAVIGATE',
      transition: { type: 'INSTANT', duration: 0.3 },
      overlayPosition: 'CENTER'
    })
    expect(step(graph, there, { type: 'BACK' }).frameId).toBe(first.id)
  })

  test('goes back nowhere from the frame play started at', () => {
    const { graph, first } = fixture()
    const session = startSession(first.id)
    expect(step(graph, session, { type: 'BACK' })).toBe(session)
  })

  test('follows no link to a layer that is not a page frame', () => {
    const { graph, first, button } = fixture()
    const session = startSession(first.id)
    expect(
      step(graph, session, {
        type: 'NODE',
        nodeId: button.id,
        navigation: 'NAVIGATE',
        transition: { type: 'INSTANT', duration: 0.3 },
        overlayPosition: 'CENTER'
      })
    ).toBe(session)
  })

  test('keeps the frame when an action it cannot show runs', () => {
    const { graph, first } = fixture()
    const session = startSession(first.id)
    expect(step(graph, session, { type: 'CLOSE' })).toBe(session)
    expect(
      step(graph, session, {
        type: 'NODE',
        nodeId: null,
        navigation: 'NAVIGATE',
        transition: { type: 'INSTANT', duration: 0.3 },
        overlayPosition: 'CENTER'
      })
    ).toBe(session)
  })
})

describe('restarting', () => {
  test('returns to the frame play started at and forgets the way it came', () => {
    const { graph, first, second } = fixture()
    const there = step(graph, startSession(first.id), {
      type: 'NODE',
      nodeId: second.id,
      navigation: 'NAVIGATE',
      transition: { type: 'INSTANT', duration: 0.3 },
      overlayPosition: 'CENTER'
    })
    expect(restartSession(there)).toEqual({
      frameId: first.id,
      startFrameId: first.id,
      history: []
    })
  })
})
