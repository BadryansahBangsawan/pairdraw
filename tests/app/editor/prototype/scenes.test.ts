import { afterEach, describe, expect, test } from 'bun:test'

import { computed, effectScope, nextTick, ref } from 'vue'

import { startSession, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeNodeAction, type PrototypeReaction } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { usePlayScenes } from '@/app/editor/prototype/scenes'
import { createEditorStore } from '@/app/editor/session'

import type { ArmedTimer } from '#tests/helpers/prototype-timers'

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

/** A loader whose Loading variant holds a plain Spinner that turns Done after a delay. */
function childDelayDocument() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
  const idle = graph.createNode('COMPONENT', set.id, { name: 'State=Idle', width: 20, height: 20 })
  const loading = graph.createNode('COMPONENT', set.id, {
    name: 'State=Loading',
    x: 40,
    width: 20,
    height: 20
  })
  const done = graph.createNode('COMPONENT', set.id, { name: 'State=Done', x: 80 })
  const spinner = graph.createNode('RECTANGLE', loading.id, {
    name: 'Spinner',
    width: 10,
    height: 10
  })
  graph.updateNode(spinner.id, { prototypeReactions: [changeTo(done.id, 'AFTER_TIMEOUT')] })
  graph.updateNode(idle.id, { prototypeReactions: [changeTo(loading.id, 'ON_CLICK')] })
  const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
  const instance = graph.createInstance(idle.id, screen.id)
  if (!instance) throw new Error('no instance')
  return { graph, screen, instance, idle, loading, done }
}

/** A loader whose Loading variant's plain Spinner navigates to `third` after a delay. */
function childNavigateDocument() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
  const idle = graph.createNode('COMPONENT', set.id, { name: 'State=Idle', width: 20, height: 20 })
  const loading = graph.createNode('COMPONENT', set.id, {
    name: 'State=Loading',
    x: 40,
    width: 20,
    height: 20
  })
  const done = graph.createNode('COMPONENT', set.id, { name: 'State=Done', x: 80 })
  const spinner = graph.createNode('RECTANGLE', loading.id, {
    name: 'Spinner',
    width: 10,
    height: 10
  })
  const third = graph.createNode('FRAME', pageId, { name: 'Third', x: 200, width: 50, height: 50 })
  const other = graph.createNode('FRAME', pageId, { name: 'Other', x: 300, width: 50, height: 50 })
  graph.updateNode(spinner.id, { prototypeReactions: [navigateTo(third.id, 'AFTER_TIMEOUT')] })
  graph.updateNode(idle.id, { prototypeReactions: [changeTo(loading.id, 'ON_CLICK')] })
  const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
  const instance = graph.createInstance(idle.id, screen.id)
  if (!instance) throw new Error('no instance')
  return { graph, screen, instance, idle, loading, done, other, third }
}

function navigateTo(frameId: string, trigger: 'ON_CLICK' | 'AFTER_TIMEOUT'): PrototypeReaction {
  return {
    id: `navigate-${frameId}`,
    trigger: { type: trigger, delay: trigger === 'AFTER_TIMEOUT' ? DELAY_MS / 1000 : 0 },
    actions: [
      {
        type: 'NODE',
        nodeId: frameId,
        navigation: 'NAVIGATE',
        transition: { type: 'INSTANT', duration: 0 },
        overlayPosition: 'CENTER'
      }
    ]
  }
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
    live: () => [...armed.values()].filter((entry) => entry.ms >= DELAY_MS && !entry.cleared),
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

  test("an instance's After delay keeps counting when another instance switches before it", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
    const quick = graph.createNode('COMPONENT', set.id, {
      name: 'State=Quick',
      width: 20,
      height: 20
    })
    const slow = graph.createNode('COMPONENT', set.id, { name: 'State=Slow', x: 40 })
    const done = graph.createNode('COMPONENT', set.id, { name: 'State=Done', x: 80 })
    graph.updateNode(quick.id, { prototypeReactions: [changeTo(done.id, 'AFTER_TIMEOUT')] })
    graph.updateNode(slow.id, {
      prototypeReactions: [{ ...changeTo(done.id, 'AFTER_TIMEOUT'), id: 'slow-timeout' }]
    })
    const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
    graph.createInstance(quick.id, screen.id)
    graph.createInstance(slow.id, screen.id, { x: 40 })
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const scope = effectScope()
    scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 }))
      )
    )
    await nextTick()
    const [first, second] = probe.live()
    if (!first || !second) throw new Error('both loaders should count')

    first.fn()
    await nextTick()
    // The slow loader's timer runs on; nothing armed it again from zero.
    expect(second.cleared).toBe(false)
    expect(probe.live()).toEqual([second])
    scope.stop()
    store.dispose()
  })

  test('a dissolving Change to asks for the frame as it was first; an instant one and a Scroll to do not', () => {
    const { graph, screen, instance, loading, done } = loaderDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const before: string[] = []
    const scope = effectScope()
    const play = scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 })),
        {
          beforeDissolve: (rootId) => before.push(rootId)
        }
      )
    )
    if (!play) throw new Error('no play scenes')
    const dissolve = { type: 'DISSOLVE' as const, duration: 0.3 }
    const action = { ...changeTo(loading.id, 'ON_CLICK').actions[0], transition: dissolve }
    play.run({ sourceId: instance.id, action, transition: dissolve })
    expect(before).toEqual([screen.id])
    play.run({
      sourceId: instance.id,
      action: changeTo(done.id, 'ON_CLICK').actions[0],
      transition: null
    })
    const scroll = {
      type: 'NODE' as const,
      nodeId: instance.id,
      navigation: 'SCROLL_TO' as const,
      transition: { type: 'DISSOLVE' as const, duration: 0.3 },
      overlayPosition: 'CENTER' as const
    }
    play.run({ sourceId: instance.id, action: scroll, transition: scroll.transition })
    expect(before).toEqual([screen.id])
    scope.stop()
    store.dispose()
  })

  test('an animated Scroll to stops at Reset and when the wheel scrolls', async () => {
    const frames = new Map<number, (now: number) => void>()
    let next = 1
    const real = {
      request: globalThis.requestAnimationFrame,
      cancel: globalThis.cancelAnimationFrame
    }
    globalThis.requestAnimationFrame = (callback) => {
      frames.set(next, callback)
      return next++
    }
    globalThis.cancelAnimationFrame = (id) => {
      frames.delete(id)
    }
    restore = () => {
      globalThis.requestAnimationFrame = real.request
      globalThis.cancelAnimationFrame = real.cancel
    }
    const flush = () => {
      const pending = Array.from(frames.values())
      frames.clear()
      for (const callback of pending) callback(performance.now() + 1000)
    }
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
    const list = graph.createNode('FRAME', screen.id, {
      width: 100,
      height: 50,
      clipsContent: true,
      overflowDirection: 'VERTICAL'
    })
    graph.createNode('RECTANGLE', list.id, { width: 100, height: 50 })
    const last = graph.createNode('RECTANGLE', list.id, { y: 100, width: 100, height: 50 })
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const revision = ref(0)
    const scope = effectScope()
    const play = scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: revision.value }))
      )
    )
    if (!play) throw new Error('no play scenes')
    const scrollTo = {
      type: 'NODE' as const,
      nodeId: last.id,
      navigation: 'SCROLL_TO' as const,
      transition: { type: 'DISSOLVE' as const, duration: 0.3 },
      overlayPosition: 'CENTER' as const
    }
    play.run({ sourceId: screen.id, action: scrollTo, transition: scrollTo.transition })
    revision.value += 1
    await nextTick()
    flush()
    expect(play.scroll().size).toBe(0)

    play.run({ sourceId: screen.id, action: scrollTo, transition: scrollTo.transition })
    play.scrollBy([screen.id, list.id], 0, -100)
    flush()
    expect(play.scroll().get(list.id)).toEqual({ x: 0, y: 0 })
    scope.stop()
    store.dispose()
  })

  test("an instance's After delay crossfades when its Change to dissolves", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const { graph, screen, instance, loading, done } = loaderDocument()
    graph.updateNode(loading.id, {
      prototypeReactions: [
        {
          ...changeTo(done.id, 'AFTER_TIMEOUT'),
          actions: [
            {
              type: 'NODE',
              nodeId: done.id,
              navigation: 'CHANGE_TO',
              transition: { type: 'DISSOLVE', duration: 0.3 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const before: string[] = []
    const scope = effectScope()
    const play = scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 })),
        {
          beforeDissolve: (rootId) => before.push(rootId)
        }
      )
    )
    if (!play) throw new Error('no play scenes')
    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    const [timer] = probe.live()
    if (!timer) throw new Error('no timer')
    timer.fn()
    expect(before).toEqual([screen.id])
    scope.stop()
    store.dispose()
  })

  test("a child copy's inherited After delay runs once its instance shows that variant", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const { graph, screen, instance, loading, done } = childDelayDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const live = computed(() => ({ revision: 0 }))
    const scope = effectScope()
    const play = scope.run(() => usePlayScenes(store, session, live))
    if (!play) throw new Error('no play scenes')
    await nextTick()
    expect(probe.live()).toHaveLength(0)

    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    const [timer] = probe.live()
    if (!timer) throw new Error('the copy of the Spinner armed no timer')
    timer.fn()
    await nextTick()
    const played = play.graphFor(screen.id)
    const shown = played.getNode(instance.id)
    expect(shown ? instanceMainComponent(played, shown)?.id : undefined).toBe(done.id)

    scope.stop()
    store.dispose()
  })

  test("changing the variant before the delay ends cancels a child copy's timer", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const { graph, screen, instance, loading, done } = childNavigateDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const live = computed(() => ({ revision: 0 }))
    const scope = effectScope()
    const play = scope.run(() => usePlayScenes(store, session, live))
    if (!play) throw new Error('no play scenes')
    await nextTick()

    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    const [timer] = probe.live()
    if (!timer) throw new Error('the copy of the Spinner armed no timer')

    play.run({
      sourceId: instance.id,
      action: changeTo(done.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    expect(probe.live()).toHaveLength(0)
    timer.fn()
    await nextTick()
    expect(session.value?.frameId).toBe(screen.id)

    scope.stop()
    store.dispose()
  })

  test("navigating away before the delay ends cancels a child copy's timer", async () => {
    const probe = installTimerProbe()
    restore = probe.restore
    const { graph, screen, instance, loading, other } = childNavigateDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const live = computed(() => ({ revision: 0 }))
    const scope = effectScope()
    const play = scope.run(() => usePlayScenes(store, session, live))
    if (!play) throw new Error('no play scenes')
    await nextTick()

    play.run({
      sourceId: instance.id,
      action: changeTo(loading.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    expect(probe.live()).toHaveLength(1)

    play.run({
      sourceId: screen.id,
      action: navigateTo(other.id, 'ON_CLICK').actions[0],
      transition: null
    })
    await nextTick()
    // Navigation clears the timer, so leaving the frame cancels a delay that had not fired.
    expect(session.value?.frameId).toBe(other.id)
    expect(probe.live()).toHaveLength(0)
    await nextTick()
    expect(session.value?.frameId).toBe(other.id)

    scope.stop()
    store.dispose()
  })

  test('a change with no animation of its own stops the one still running', () => {
    const { graph, screen, instance, loading, done } = loaderDocument()
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const stopped: (string | undefined)[] = []
    const scope = effectScope()
    const play = scope.run(() =>
      usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 })),
        {
          onAnimationStopped: (rootId) => stopped.push(rootId)
        }
      )
    )
    if (!play) throw new Error('no play scenes')
    const smart = { type: 'SMART_ANIMATE' as const, duration: 0.5 }
    const action: PrototypeNodeAction = {
      type: 'NODE',
      nodeId: loading.id,
      navigation: 'CHANGE_TO',
      transition: smart,
      overlayPosition: 'CENTER'
    }
    play.run({ sourceId: instance.id, action, transition: smart })
    expect(stopped).toEqual([])

    // An Instant Change to during the animation shows at once: the running copy must go.
    play.run({
      sourceId: instance.id,
      action: changeTo(done.id, 'ON_CLICK').actions[0],
      transition: null
    })
    expect(stopped).toEqual([screen.id])
    scope.stop()
    store.dispose()
  })
})
