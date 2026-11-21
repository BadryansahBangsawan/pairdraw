import { describe, expect, test } from 'bun:test'

import {
  DISSOLVE_EASING_CSS,
  frameAt,
  planTimeline,
  sessionDrawKey,
  TimelineError,
  type Timeline
} from '@pairdraw/core/prototype'
import {
  SceneGraph,
  type PrototypeNodeAction,
  type PrototypeReaction,
  type PrototypeTransitionType
} from '@pairdraw/scene-graph'

const TAIL_MS = 1000
const MAX_MS = 30_000

function frames(count: number) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const ids = Array.from(
    { length: count },
    (_, index) =>
      graph.createNode('FRAME', pageId, {
        name: `Hero ${index + 1}`,
        x: index * 400,
        y: 0,
        width: 300,
        height: 200
      }).id
  )
  return { graph, ids }
}

function goTo(
  nodeId: string,
  transition: PrototypeTransitionType = 'INSTANT',
  duration = 0.3,
  navigation: PrototypeNodeAction['navigation'] = 'NAVIGATE'
): PrototypeNodeAction {
  return {
    type: 'NODE',
    nodeId,
    navigation,
    transition: { type: transition, duration },
    overlayPosition: 'CENTER'
  }
}

function after(seconds: number, action: PrototypeReaction['actions'][number]): PrototypeReaction {
  return {
    id: `timeout-${seconds}-${JSON.stringify(action)}`,
    trigger: { type: 'AFTER_TIMEOUT', delay: seconds },
    actions: [action]
  }
}

function onClick(action: PrototypeReaction['actions'][number]): PrototypeReaction {
  return {
    id: `click-${JSON.stringify(action)}`,
    trigger: { type: 'ON_CLICK', delay: 0 },
    actions: [action]
  }
}

function react(graph: SceneGraph, id: string, ...reactions: PrototypeReaction[]) {
  graph.updateNode(id, { prototypeReactions: reactions })
}

/** Segments as `kind frame(s) start–end`, which reads like the timeline it describes. */
function outline(timeline: Timeline, graph: SceneGraph): string[] {
  const name = (frameId: string) => graph.getNode(frameId)?.name ?? frameId
  return timeline.segments.map((segment) =>
    segment.kind === 'hold'
      ? `hold ${name(segment.session.frameId)} ${segment.startMs}–${segment.endMs}`
      : `dissolve ${name(segment.from.frameId)}→${name(segment.to.frameId)} ${segment.startMs}–${segment.endMs}`
  )
}

describe('a prototype timeline', () => {
  test('follows After delay chains, counting each delay from when its transition ends', () => {
    const { graph, ids } = frames(3)
    const [a, b, c] = ids
    react(graph, a, after(1, goTo(b, 'DISSOLVE', 0.3)))
    react(graph, b, after(2, goTo(c)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    expect(outline(timeline, graph)).toEqual([
      'hold Hero 1 0–1000',
      'dissolve Hero 1→Hero 2 1000–1300',
      'hold Hero 2 1300–3300',
      'hold Hero 3 3300–4300'
    ])
    expect(timeline.durationMs).toBe(4300)
    expect(timeline.loops).toBe(false)
    expect(timeline.truncated).toBe(false)
    expect(timeline.steps).toEqual([
      { atMs: 1000, frameId: b, trigger: 'AFTER_TIMEOUT', transition: 'DISSOLVE' },
      { atMs: 3300, frameId: c, trigger: 'AFTER_TIMEOUT', transition: 'INSTANT' }
    ])
  })
})

describe('a Smart animate step', () => {
  test('takes its own duration, and the step names its transition', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    react(graph, a, after(1, goTo(b, 'SMART_ANIMATE', 0.4)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    expect(outline(timeline, graph).slice(0, 2)).toEqual([
      'hold Hero 1 0–1000',
      'dissolve Hero 1→Hero 2 1000–1400'
    ])
    expect(timeline.steps).toEqual([
      { atMs: 1000, frameId: b, trigger: 'AFTER_TIMEOUT', transition: 'SMART_ANIMATE' }
    ])
  })
})

describe('the screen a timeline shows at a moment', () => {
  test('is the held frame, or both frames of a crossfade with the eased share of the new one', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    react(graph, a, after(1, goTo(b, 'DISSOLVE', 0.3)))
    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    expect(frameAt(timeline, 0)).toEqual({ session: expect.objectContaining({ frameId: a }) })
    // Frame 31 at 30 fps is 1033.3 ms: a ninth of the way through the 300 ms crossfade.
    const mid = frameAt(timeline, (31 * 1000) / 30)
    if (!('mix' in mid)) throw new Error('Frame 31 is not mid-crossfade')
    expect(mid.from.frameId).toBe(a)
    expect(mid.to.frameId).toBe(b)
    // ease-out at x = 1/9: cubic-bezier(0, 0, 0.58, 1) solved to 200 bisection steps gives
    // y = 0.177555.
    expect(mid.mix).toBeCloseTo(0.177555, 5)
    expect(frameAt(timeline, 1300)).toEqual({ session: expect.objectContaining({ frameId: b }) })
    expect(frameAt(timeline, 99_000)).toEqual({ session: expect.objectContaining({ frameId: b }) })
  })
})

describe('the key of what play draws', () => {
  test('follows the frame and its overlays, not the history Back uses', () => {
    const shown = { frameId: '1:1', startFrameId: '1:1', history: [], overlays: ['1:3'] }
    expect(sessionDrawKey({ ...shown, history: ['1:2'] })).toBe(sessionDrawKey(shown))
    expect(sessionDrawKey({ ...shown, overlays: [] })).not.toBe(sessionDrawKey(shown))
  })
})

describe('the dissolve curve', () => {
  test('is CSS ease-out, which the player draws its crossfade with', () => {
    expect(DISSOLVE_EASING_CSS).toBe('cubic-bezier(0, 0, 0.58, 1)')
  })
})

describe('where a timeline ends', () => {
  test('is the return to the start screen, so the clip loops', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    react(graph, a, after(1, goTo(b)))
    react(graph, b, after(1.5, goTo(a, 'DISSOLVE', 0.5)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    expect(outline(timeline, graph)).toEqual([
      'hold Hero 1 0–1000',
      'hold Hero 2 1000–2500',
      'dissolve Hero 2→Hero 1 2500–3000'
    ])
    expect(timeline.durationMs).toBe(3000)
    expect(timeline.loops).toBe(true)
  })

  test('is the cap when the flow goes on longer', () => {
    const { graph, ids } = frames(3)
    const [a, b, c] = ids
    react(graph, a, after(1, goTo(b)))
    react(graph, b, after(1, goTo(c)))
    react(graph, c, after(1, goTo(b)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 2500, tailMs: TAIL_MS })

    expect(timeline.durationMs).toBe(2500)
    expect(timeline.truncated).toBe(true)
    expect(timeline.loops).toBe(false)
    expect(outline(timeline, graph).at(-1)).toBe('hold Hero 3 2000–2500')
  })

  test('is the cap when it falls inside the last crossfade', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    react(graph, a, after(1, goTo(b, 'DISSOLVE', 1)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 1500, tailMs: TAIL_MS })

    expect(timeline.durationMs).toBe(1500)
    expect(timeline.truncated).toBe(true)
    expect(outline(timeline, graph)).toEqual([
      'hold Hero 1 0–1000',
      'dissolve Hero 1→Hero 2 1000–2000'
    ])
  })

  test('refuses a cycle that takes no time', () => {
    const { graph, ids } = frames(3)
    const [a, b, c] = ids
    react(graph, a, after(1, goTo(b)))
    react(graph, b, after(0, goTo(c)))
    react(graph, c, after(0, goTo(b)))

    expect(() => planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })).toThrow(
      TimelineError
    )
  })

  test('keeps the last screen when the flow ends at once and nothing holds it', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    react(graph, a, after(0, goTo(b)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: 0 })

    expect(outline(timeline, graph)).toEqual(['hold Hero 2 0–0'])
    expect(timeline.durationMs).toBe(0)
    expect(frameAt(timeline, 0)).toEqual({ session: expect.objectContaining({ frameId: b }) })
  })

  test('refuses a start frame with nothing to follow', () => {
    const { graph, ids } = frames(2)
    expect(() =>
      planTimeline(graph, { startFrameId: ids[0], maxMs: MAX_MS, tailMs: TAIL_MS })
    ).toThrow("'Hero 1' has no After delay interaction to follow")
    // Front ends say this one in their own words, so it carries its reason.
    try {
      planTimeline(graph, { startFrameId: ids[0], maxMs: MAX_MS, tailMs: TAIL_MS })
    } catch (error) {
      expect(error).toMatchObject({ reason: 'nothing-to-follow' })
    }
  })
})

describe('steps a timeline takes', () => {
  test('run the earliest of a frame’s After delays', () => {
    const { graph, ids } = frames(3)
    const [a, b, c] = ids
    react(graph, a, after(2, goTo(b)), after(1, goTo(c)))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    expect(timeline.steps.map((entry) => [entry.atMs, entry.frameId])).toEqual([[1000, c]])
  })

  test('run a scripted click through the reaction on the layer or its nearest ancestor', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    const button = graph.createNode('FRAME', a, {
      name: 'Buy',
      x: 10,
      y: 10,
      width: 80,
      height: 40
    })
    const label = graph.createNode('TEXT', button.id, {
      name: 'Label',
      x: 0,
      y: 0,
      width: 80,
      height: 40
    })
    react(graph, button.id, onClick(goTo(b, 'DISSOLVE', 0.2)))

    const timeline = planTimeline(graph, {
      startFrameId: a,
      clicks: [{ atMs: 500, nodeId: label.id }],
      maxMs: MAX_MS,
      tailMs: TAIL_MS
    })

    expect(outline(timeline, graph)).toEqual([
      'hold Hero 1 0–500',
      'dissolve Hero 1→Hero 2 500–700',
      'hold Hero 2 700–1700'
    ])
    expect(timeline.steps).toEqual([
      { atMs: 500, frameId: b, trigger: 'ON_CLICK', transition: 'DISSOLVE' }
    ])
  })

  test('refuse a click on a layer that is not on the shown frame', () => {
    const { graph, ids } = frames(2)
    const [a, b] = ids
    const buy = graph.createNode('RECTANGLE', b, { name: 'Buy', x: 0, y: 0, width: 10, height: 10 })
    react(graph, a, after(1, goTo(b)))

    expect(() =>
      planTimeline(graph, {
        startFrameId: a,
        clicks: [{ atMs: 400, nodeId: buy.id }],
        maxMs: MAX_MS,
        tailMs: TAIL_MS
      })
    ).toThrow("click 1: 'Buy' is not on the shown frame 'Hero 1' at 0.40 s")
  })

  test('open and close overlays over the base screen', () => {
    const { graph, ids } = frames(2)
    const [a, menu] = ids
    react(graph, a, after(1, goTo(menu, 'INSTANT', 0, 'OVERLAY')))
    react(graph, menu, after(1, { type: 'CLOSE' }))

    const timeline = planTimeline(graph, { startFrameId: a, maxMs: MAX_MS, tailMs: TAIL_MS })

    const overlaid = timeline.segments[1]
    expect(overlaid?.kind === 'hold' && overlaid.session).toMatchObject({
      frameId: a,
      overlays: [menu]
    })
    expect(timeline.overlayPositions).toEqual({ [menu]: 'CENTER' })
    expect(timeline.loops).toBe(true)
    expect(timeline.durationMs).toBe(2000)
  })

  test('cut a running crossfade short when a click steps during it', () => {
    const { graph, ids } = frames(3)
    const [a, b, c] = ids
    const next = graph.createNode('RECTANGLE', b, {
      name: 'Next',
      x: 0,
      y: 0,
      width: 10,
      height: 10
    })
    react(graph, a, after(1, goTo(b, 'DISSOLVE', 1)))
    react(graph, next.id, onClick(goTo(c)))

    const timeline = planTimeline(graph, {
      startFrameId: a,
      clicks: [{ atMs: 1400, nodeId: next.id }],
      maxMs: MAX_MS,
      tailMs: TAIL_MS
    })

    expect(outline(timeline, graph)).toEqual([
      'hold Hero 1 0–1000',
      'dissolve Hero 1→Hero 2 1000–1400',
      'hold Hero 3 1400–2400'
    ])
    // The fade keeps its own pace until the cut: a quarter of the way through its 1 s, ease-out
    // (cubic-bezier(0, 0, 0.58, 1), solved to 200 bisection steps) shows 0.378138 of Hero 2.
    const quarter = frameAt(timeline, 1250)
    expect('mix' in quarter ? quarter.mix : null).toBeCloseTo(0.378138, 5)
  })
})
