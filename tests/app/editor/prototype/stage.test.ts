import { afterEach, describe, expect, test } from 'bun:test'

import { effectScope, nextTick, ref } from 'vue'

import { shownFrame, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

import { usePrototypeStage } from '@/app/editor/prototype/stage'
import { createEditorStore } from '@/app/editor/session'

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

interface ArmedTimer {
  fn: () => void
  ms: number
  cleared: boolean
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
    if (!first) throw new Error('The start frame armed no timeout')
    first.fn()
    await nextTick()

    expect(shown(stage.session.value)).toBe(TARGET)
    expect(probe.armedFor(DELAY_MS + 500)).toHaveLength(1)

    scope.stop()
    store.dispose()
  })
})
