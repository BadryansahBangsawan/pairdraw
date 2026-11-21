import { afterEach, describe, expect, test } from 'bun:test'

import { computed, effectScope, nextTick, ref } from 'vue'

import { startSession, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { usePlayScenes } from '@/app/editor/prototype/scenes'
import { createEditorStore } from '@/app/editor/session'

const DELAY_MS = 1500

function changeTo(variantId: string, trigger: 'ON_CLICK' | 'AFTER_TIMEOUT'): PrototypeReaction {
  return {
    id: `${trigger}-${variantId}`,
    trigger: { type: trigger, delay: trigger === 'AFTER_TIMEOUT' ? DELAY_MS / 1000 : 0 },
    actions: [
      {
        type: 'NODE',
        nodeId: variantId,
        navigation: 'CHANGE_TO',
        transition: { type: 'INSTANT', duration: 0 },
        overlayPosition: 'CENTER'
      }
    ]
  }
}

/** A loader set whose Loading variant turns Done after a delay, and a screen showing Idle. */
function loaderDocument() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
  const idle = graph.createNode('COMPONENT', set.id, { name: 'State=Idle', width: 20, height: 20 })
  const loading = graph.createNode('COMPONENT', set.id, { name: 'State=Loading', x: 40 })
  const done = graph.createNode('COMPONENT', set.id, { name: 'State=Done', x: 80 })
  graph.updateNode(idle.id, { prototypeReactions: [changeTo(loading.id, 'ON_CLICK')] })
  graph.updateNode(loading.id, { prototypeReactions: [changeTo(done.id, 'AFTER_TIMEOUT')] })
  const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
  const instance = graph.createInstance(idle.id, screen.id)
  if (!instance) throw new Error('no instance')
  return { graph, screen, instance, idle, loading, done }
}

interface ArmedTimer {
  fn: () => void
  ms: number
  cleared: boolean
}

function installTimerProbe() {
  if (globalThis.window === undefined) Object.assign(globalThis, { window: globalThis })
  const realSet = window.setTimeout.bind(window)
  const realClear = window.clearTimeout.bind(window)
  const armed = new Map<number, ArmedTimer>()
  let nextId = 1
  window.setTimeout = ((fn: TimerHandler, ms?: number) => {
    const id = nextId++
    const entry: ArmedTimer = {
      // A timer that ran is spent, as a cleared one is.
      fn: () => {
        entry.cleared = true
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
    live: () => [...armed.values()].filter((entry) => entry.ms === DELAY_MS && !entry.cleared),
    restore: () => {
      window.setTimeout = realSet
      window.clearTimeout = realClear
    }
  }
}

describe('play scenes on the stage', () => {
  let restore: (() => void) | null = null
  afterEach(() => {
    restore?.()
    restore = null
  })

  test("an instance's After delay runs once it shows its variant, and Reset cancels it", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const { graph, screen, instance, loading, done, idle } = loaderDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const revision = ref(0)
    const live = computed(() => ({ revision: revision.value }))
    const scope = effectScope()
    const play = scope.run(() => usePlayScenes(store, session, live))
    if (!play) throw new Error('no play scenes')
    await nextTick()
    const shows = () => {
      const played = play.graphFor(screen.id)
      const node = played.getNode(instance.id)
      return node ? instanceMainComponent(played, node)?.id : undefined
    }
    expect(probe.live()).toHaveLength(0)

    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    expect(shows()).toBe(loading.id)
    expect(play.views().has(screen.id)).toBe(true)
    const [timer] = probe.live()
    if (!timer) throw new Error('the Loading variant armed no timer')
    timer.fn()
    expect(shows()).toBe(done.id)

    // Back to Loading, then Reset: the copy goes and its timer with it.
    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    expect(probe.live()).toHaveLength(1)
    revision.value += 1
    await nextTick()
    expect(probe.live()).toHaveLength(0)
    expect(play.views().size).toBe(0)
    expect(shows()).toBe(idle.id)

    scope.stop()
    store.dispose()
  })

  test('an edit inside a changed frame puts it back as designed', async () => {
    const { graph, screen, instance, loading } = loaderDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const scope = effectScope()
    const play = scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 }))
      )
    )
    if (!play) throw new Error('no play scenes')
    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    expect(play.views().size).toBe(1)

    store.graph.updateNode(instance.id, { name: 'Renamed' })
    expect(play.views().size).toBe(0)
    scope.stop()
    store.dispose()
  })
})
