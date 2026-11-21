import { afterEach, describe, expect, test } from 'bun:test'

import { effectScope, nextTick, ref } from 'vue'

import { shownFrame, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

import { usePrototypeStage } from '@/app/editor/prototype/stage'
import { createEditorStore } from '@/app/editor/session'

import type { ArmedTimer } from '#tests/helpers/prototype-timers'

const START = '1:1'
const TARGET = '1:2'
const DELAY_MS = 1000

const timeoutToTarget: PrototypeReaction = {
  id: '9:1',
  trigger: { type: 'AFTER_TIMEOUT', delay: DELAY_MS / 1000 },
  actions: [
    {
      type: 'NODE',
      nodeId: TARGET,
      navigation: 'NAVIGATE',
      transition: { type: 'INSTANT', duration: 0 },
      overlayPosition: 'CENTER'
    }
  ]
}

function documentWith(timeout: boolean) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  graph.createNodeWithId(START, 'FRAME', pageId, { x: 0, y: 0, width: 300, height: 200 })
  graph.createNodeWithId(TARGET, 'FRAME', pageId, { x: 400, y: 0, width: 300, height: 200 })
  if (timeout) graph.updateNode(START, { prototypeReactions: [timeoutToTarget] })
  return graph
}

function ensureWindow(): void {
  if (globalThis.window !== undefined) return
  Object.assign(globalThis, { window: globalThis })
}

function installTimerProbe() {
  ensureWindow()
  const realSet = window.setTimeout.bind(window)
  const realClear = window.clearTimeout.bind(window)
  const armed = new Map<number, ArmedTimer>()
  let nextId = 1
  window.setTimeout = ((fn: TimerHandler, ms?: number) => {
    const id = nextId++
    const entry: ArmedTimer = {
      fn: () => {
        if (typeof fn === 'function') fn()
      },
      ms: ms ?? 0,
      cleared: false
    }
    armed.set(id, entry)
    return id
  }) as typeof window.setTimeout
  window.clearTimeout = ((id: number) => {
    const entry = armed.get(id)
    if (entry) entry.cleared = true
    realClear(id)
  }) as typeof window.clearTimeout
  return {
    prototypeTimers: () => [...armed.values()].filter((entry) => entry.ms === DELAY_MS),
    allTimers: () => [...armed.values()].filter((entry) => !entry.cleared),
    armedFor: (ms: number) =>
      [...armed.values()].filter((entry) => entry.ms === ms && !entry.cleared),
    restore: () => {
      window.setTimeout = realSet
      window.clearTimeout = realClear
    }
  }
}

function shown(session: PlaySession | null): string | null {
  return session ? shownFrame(session) : null
}

describe('prototype play timeouts', () => {
  let restore: (() => void) | null = null

  afterEach(() => {
    restore?.()
    restore = null
  })

  test('restart and a replaced document drop the timeout captured from the frame', async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const store = createEditorStore(documentWith(true))
    store.startPlay()
    const scope = effectScope()
    const stage = scope.run(() => usePrototypeStage(store, ref<HTMLCanvasElement | null>(null)))
    if (!stage) throw new Error('Play stage did not start')
    await nextTick()

    const armed = probe.prototypeTimers()
    expect(armed).toHaveLength(1)
    expect(shown(stage.session.value)).toBe(START)
    const captured = armed[0]
    if (!captured) throw new Error('The frame armed no timeout')

    store.resetPlay()
    await nextTick()
    expect(captured.cleared).toBe(true)
    captured.fn()
    expect(shown(stage.session.value)).toBe(START)

    store.replaceGraph(documentWith(false))
    await nextTick()
    for (const timer of probe.prototypeTimers()) {
      if (timer === captured) continue
      expect(timer.cleared).toBe(true)
      timer.fn()
    }
    expect(shown(stage.session.value)).toBe(START)

    scope.stop()
    captured.fn()
    expect(shown(stage.session.value)).toBe(START)
    store.dispose()
  })
})

describe('prototype play transitions on a timeout', () => {
  let restore: (() => void) | null = null

  afterEach(() => {
    restore?.()
    restore = null
  })

  test('count the next frame’s delay from the end of an instance timer’s dissolve', async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const start = graph.createNodeWithId(START, 'FRAME', pageId, {
      x: 0,
      y: 0,
      width: 300,
      height: 200
    })
    graph.createNodeWithId(TARGET, 'FRAME', pageId, { x: 400, y: 0, width: 300, height: 200 })
    const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
    const loading = graph.createNode('COMPONENT', set.id, {
      name: 'State=Loading',
      width: 20,
      height: 20
    })
    graph.updateNode(loading.id, {
      prototypeReactions: [
        {
          id: 'instance-navigate',
          trigger: { type: 'AFTER_TIMEOUT', delay: 0.1 },
          actions: [
            {
              type: 'NODE',
              nodeId: TARGET,
              navigation: 'NAVIGATE',
              transition: { type: 'DISSOLVE', duration: 0.5 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    graph.updateNode(TARGET, { prototypeReactions: [timeoutToTarget] })
    if (!graph.createInstance(loading.id, start.id, { x: 10, y: 10 })) {
      throw new Error('no instance')
    }
    const store = createEditorStore(graph)
    store.startPlay()
    const scope = effectScope()
    const stage = scope.run(() => usePrototypeStage(store, ref<HTMLCanvasElement | null>(null)))
    if (!stage) throw new Error('Play stage did not start')
    await nextTick()

    const instanceTimer = probe.allTimers().find((timer) => timer.ms === 100)
    if (!instanceTimer) throw new Error('the instance armed no timeout')
    instanceTimer.fn()
    await nextTick()

    expect(shown(stage.session.value)).toBe(TARGET)
    expect(probe.armedFor(DELAY_MS + 500)).toHaveLength(1)
    expect(probe.armedFor(DELAY_MS)).toHaveLength(0)

    scope.stop()
    store.dispose()
  })

  test('count the next frame’s delay from when its dissolve ends, as Figma does', async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const dissolveToTarget: PrototypeReaction = {
      ...timeoutToTarget,
      actions: [
        {
          type: 'NODE',
          nodeId: TARGET,
          navigation: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 0.5 },
          overlayPosition: 'CENTER'
        }
      ]
    }
    const back: PrototypeReaction = {
      ...timeoutToTarget,
      id: '9:2',
      actions: [{ type: 'BACK' }]
    }
    const graph = documentWith(false)
    graph.updateNode(START, { prototypeReactions: [dissolveToTarget] })
    graph.updateNode(TARGET, { prototypeReactions: [back] })
    const store = createEditorStore(graph)
    store.startPlay()
    const scope = effectScope()
    const stage = scope.run(() => usePrototypeStage(store, ref<HTMLCanvasElement | null>(null)))
    if (!stage) throw new Error('Play stage did not start')
    await nextTick()

    const [first] = probe.prototypeTimers()
    if (!first) throw new Error('the start frame armed no timeout')
    first.fn()
    await nextTick()

    expect(shown(stage.session.value)).toBe(TARGET)
    expect(probe.armedFor(DELAY_MS + 500)).toHaveLength(1)

    scope.stop()
    store.dispose()
  })
})

describe('prototype play with Smart animate', () => {
  let restore: (() => void) | null = null

  afterEach(() => {
    restore?.()
    restore = null
  })

  /** Animation frames the test steps by hand, each given a time in milliseconds. */
  function installFrameProbe() {
    const frames = new Map<number, (now: number) => void>()
    let next = 1
    const real = {
      request: globalThis.requestAnimationFrame,
      cancel: globalThis.cancelAnimationFrame,
      now: performance.now.bind(performance)
    }
    let clock = 0
    globalThis.requestAnimationFrame = (callback) => {
      frames.set(next, callback)
      return next++
    }
    globalThis.cancelAnimationFrame = (id) => {
      frames.delete(id)
    }
    performance.now = () => clock
    return {
      /** Runs the frames waiting now, at `ms`. */
      step(ms: number) {
        clock = ms
        const due = [...frames.values()]
        frames.clear()
        for (const frame of due) frame(ms)
      },
      restore() {
        globalThis.requestAnimationFrame = real.request
        globalThis.cancelAnimationFrame = real.cancel
        performance.now = real.now
      }
    }
  }

  test('moves the layers both screens share, then shows the destination as designed', async () => {
    const timers = installTimerProbe()
    const frames = installFrameProbe()
    restore = () => {
      timers.restore()
      frames.restore()
    }
    const graph = documentWith(false)
    graph.createNode('RECTANGLE', START, { name: 'Card', x: 10, y: 10, width: 50, height: 50 })
    const card = graph.createNode('RECTANGLE', TARGET, {
      name: 'Card',
      x: 110,
      y: 10,
      width: 50,
      height: 50
    })
    graph.updateNode(START, {
      prototypeReactions: [
        {
          ...timeoutToTarget,
          actions: [
            {
              type: 'NODE',
              nodeId: TARGET,
              navigation: 'NAVIGATE',
              transition: { type: 'SMART_ANIMATE', duration: 0.5, easing: 'LINEAR' },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    graph.updateNode(TARGET, {
      prototypeReactions: [{ ...timeoutToTarget, id: '9:2', actions: [{ type: 'BACK' }] }]
    })
    const store = createEditorStore(graph)
    store.startPlay()
    const scope = effectScope()
    const stage = scope.run(() => usePrototypeStage(store, ref<HTMLCanvasElement | null>(null)))
    if (!stage) throw new Error('Play stage did not start')
    await nextTick()

    const [first] = timers.prototypeTimers()
    if (!first) throw new Error('The start frame armed no timeout')
    first.fn()
    await nextTick()

    expect(shown(stage.session.value)).toBe(TARGET)
    const drawn = () => stage.playScenes().get(TARGET)?.graph.getNode(card.id)?.x
    expect(drawn()).toBe(10)
    frames.step(250)
    expect(drawn()).toBe(60)
    frames.step(500)
    // Done: the destination is drawn from the document again.
    expect(stage.playScenes().has(TARGET)).toBe(false)
    expect(graph.getNode(card.id)?.x).toBe(110)
    expect(timers.armedFor(DELAY_MS + 500)).toHaveLength(1)

    scope.stop()
    store.dispose()
  })
})
