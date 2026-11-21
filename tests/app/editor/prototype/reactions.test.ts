import { describe, expect, test } from 'bun:test'

import { framesOnPage, primaryAction } from '@pairdraw/core/prototype'
import { SceneGraph } from '@pairdraw/scene-graph'

import {
  DEFAULT_TIMEOUT_DELAY,
  DEFAULT_TRANSITION_DURATION,
  createReaction,
  setActionType,
  setDelay,
  setNavigation,
  setTarget,
  setTransition,
  setTransitionDuration,
  setTriggerType,
  withReaction,
  withReactionChange,
  withoutReaction
} from '@/app/editor/prototype/reactions'

function reaction() {
  return createReaction()
}

describe('a new interaction', () => {
  test('starts as a click that navigates to no frame yet', () => {
    const created = reaction()
    expect(created.trigger).toEqual({ type: 'ON_CLICK', delay: 0 })
    expect(primaryAction(created)).toEqual({
      type: 'NODE',
      nodeId: null,
      navigation: 'NAVIGATE',
      transition: { type: 'INSTANT', duration: DEFAULT_TRANSITION_DURATION },
      overlayPosition: 'CENTER'
    })
  })

  test('gets a fresh id every time', () => {
    expect(reaction().id).not.toBe(reaction().id)
  })
})

describe('the reaction list', () => {
  test('adds a reaction at the end', () => {
    const first = reaction()
    const second = reaction()
    expect(withReaction([first], second)).toEqual([first, second])
  })

  test('removes only the reaction asked for', () => {
    const first = reaction()
    const second = reaction()
    expect(withoutReaction([first, second], first.id)).toEqual([second])
  })

  test('changes one reaction and leaves the others as they were', () => {
    const first = reaction()
    const second = reaction()
    const next = withReactionChange([first, second], second.id, (current) => setDelay(current, 2))
    expect(next[0]).toBe(first)
    expect(next[1]?.trigger.delay).toBe(2)
  })
})

describe('the trigger', () => {
  test('gives a new delay Figma uses when it becomes a delay trigger', () => {
    const next = setTriggerType(reaction(), 'AFTER_TIMEOUT')
    expect(next.trigger).toEqual({ type: 'AFTER_TIMEOUT', delay: DEFAULT_TIMEOUT_DELAY })
  })

  test('keeps an edited delay when the trigger stays a delay', () => {
    const delayed = setDelay(setTriggerType(reaction(), 'AFTER_TIMEOUT'), 2.5)
    expect(setTriggerType(delayed, 'AFTER_TIMEOUT')).toBe(delayed)
  })

  test('clears the delay on a click trigger', () => {
    const delayed = setDelay(setTriggerType(reaction(), 'AFTER_TIMEOUT'), 2)
    expect(setTriggerType(delayed, 'ON_CLICK').trigger).toEqual({ type: 'ON_CLICK', delay: 0 })
  })
})

describe('the action', () => {
  test('keeps the frame, animation, and placement while it stays a navigation', () => {
    const target = setTarget(reaction(), '1:2')
    const overlay = setNavigation(target, 'OVERLAY')
    expect(primaryAction(overlay)).toMatchObject({ nodeId: '1:2', navigation: 'OVERLAY' })
  })

  test('drops the node fields when it becomes Back', () => {
    const next = setActionType(setTarget(reaction(), '1:2'), 'BACK')
    expect(primaryAction(next)).toEqual({ type: 'BACK' })
  })

  test('becomes a navigation again with a frame to pick', () => {
    const next = setActionType(setActionType(reaction(), 'CLOSE'), 'NODE')
    expect(primaryAction(next)).toMatchObject({
      type: 'NODE',
      nodeId: null,
      navigation: 'NAVIGATE'
    })
  })

  test('ignores node-only edits on a Back action', () => {
    const back = setActionType(reaction(), 'BACK')
    expect(setTarget(back, '1:2')).toBe(back)
    expect(setTransition(back, 'DISSOLVE')).toBe(back)
  })
})

describe('the animation', () => {
  test('changes the kind and keeps the duration', () => {
    const next = setTransition(reaction(), 'DISSOLVE')
    expect(primaryAction(next)).toMatchObject({
      transition: { type: 'DISSOLVE', duration: DEFAULT_TRANSITION_DURATION }
    })
  })

  test('changes the duration and keeps the kind', () => {
    const dissolve = setTransitionDuration(setTransition(reaction(), 'DISSOLVE'), 0.8)
    expect(primaryAction(dissolve)).toMatchObject({
      transition: { type: 'DISSOLVE', duration: 0.8 }
    })
  })
})

describe('frames a link can point at', () => {
  test('lists the page frames in page order and leaves other layers out', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0]?.id
    if (!pageId) throw new Error('no page')
    const second = graph.createNode('FRAME', pageId, { name: 'Second' })
    graph.createNode('RECTANGLE', pageId, { name: 'Card' })
    const first = graph.createNode('FRAME', pageId, { name: 'First' })
    graph.createNode('FRAME', second.id, { name: 'Nested' })
    expect(framesOnPage(graph, pageId).map((frame) => frame.name)).toEqual(['Second', 'First'])
    expect(framesOnPage(graph, pageId)[1]?.id).toBe(first.id)
  })
})
