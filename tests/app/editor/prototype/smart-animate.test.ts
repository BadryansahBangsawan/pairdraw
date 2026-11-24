import { afterEach, describe, expect, test } from 'bun:test'

import { computed, effectScope, ref } from 'vue'

import { createSmartAnimation, startSession, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeNodeAction } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { usePlayScenes } from '@/app/editor/prototype/scenes'
import { usePlaySmartAnimate } from '@/app/editor/prototype/smart-animate'
import { createEditorStore } from '@/app/editor/session'
import {
  updateAnimationPreference,
  updateRenderingPreferences
} from '@/app/settings/preferences/store'
import { animationsEnabled } from '@/app/shell/motion'

/** Two screens whose Card moves, so a Smart animate has something to draw. */
function screens() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const a = graph.createNode('FRAME', pageId, { name: 'A', width: 400, height: 300 })
  const b = graph.createNode('FRAME', pageId, { name: 'B', x: 600, width: 400, height: 300 })
  graph.createNode('RECTANGLE', a.id, { name: 'Card', x: 0 })
  graph.createNode('RECTANGLE', b.id, { name: 'Card', x: 100 })
  return { graph, a, b }
}

describe('play Smart animate on the display', () => {
  let restoreRaf: (() => void) | null = null
  afterEach(() => {
    restoreRaf?.()
    restoreRaf = null
    updateAnimationPreference('system')
    updateRenderingPreferences({ ultralight: false })
  })

  function stubRaf() {
    if (globalThis.window === undefined) Object.assign(globalThis, { window: globalThis })
    const real = {
      request: globalThis.requestAnimationFrame,
      cancel: globalThis.cancelAnimationFrame
    }
    globalThis.requestAnimationFrame = () => 1
    globalThis.cancelAnimationFrame = () => 0
    restoreRaf = () => {
      globalThis.requestAnimationFrame = real.request
      globalThis.cancelAnimationFrame = real.cancel
    }
  }

  function running() {
    stubRaf()
    const { graph, a, b } = screens()
    const store = createEditorStore(graph)
    const scope = effectScope()
    const smart = scope.run(() => usePlaySmartAnimate(store))
    if (!smart) throw new Error('no smart animate')
    return { smart, graph, a, b, scope, store }
  }

  test('with Animations set to Off, Smart animate cuts', () => {
    updateAnimationPreference('off')
    expect(animationsEnabled.value).toBe(false)
    const { smart, graph, a, b, scope, store } = running()

    smart.start(createSmartAnimation({ graph, rootId: a.id }, { graph, rootId: b.id }), 500)

    expect(smart.views(new Map()).has(b.id)).toBe(false)
    scope.stop()
    store.dispose()
  })

  test('in Ultralight mode, Smart animate cuts', () => {
    updateRenderingPreferences({ ultralight: true })
    expect(animationsEnabled.value).toBe(false)
    const { smart, graph, a, b, scope, store } = running()

    smart.start(createSmartAnimation({ graph, rootId: a.id }, { graph, rootId: b.id }), 500)

    expect(smart.views(new Map()).has(b.id)).toBe(false)
    scope.stop()
    store.dispose()
  })

  test('with animations on, Smart animate draws over the destination frame', () => {
    expect(animationsEnabled.value).toBe(true)
    const { smart, graph, a, b, scope, store } = running()

    smart.start(createSmartAnimation({ graph, rootId: a.id }, { graph, rootId: b.id }), 500)

    expect(smart.views(new Map()).has(b.id)).toBe(true)
    smart.stop()
    expect(smart.views(new Map()).has(b.id)).toBe(false)
    scope.stop()
    store.dispose()
  })

  test('an Instant Change to during a Smart animate shows at once, not the stale copy', () => {
    if (globalThis.window === undefined) Object.assign(globalThis, { window: globalThis })
    const frames = new Map<number, (now: number) => void>()
    let next = 1
    let clock = 0
    const real = {
      request: globalThis.requestAnimationFrame,
      cancel: globalThis.cancelAnimationFrame,
      now: performance.now.bind(performance)
    }
    globalThis.requestAnimationFrame = (callback) => {
      frames.set(next, callback)
      return next++
    }
    globalThis.cancelAnimationFrame = (id) => {
      frames.delete(id)
    }
    performance.now = () => clock
    restoreRaf = () => {
      globalThis.requestAnimationFrame = real.request
      globalThis.cancelAnimationFrame = real.cancel
      performance.now = real.now
    }
    const step = (ms: number) => {
      clock = ms
      const due = [...frames.values()]
      frames.clear()
      for (const callback of due) callback(ms)
    }

    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const set = graph.createNode('COMPONENT_SET', pageId, { y: 400 })
    const off = graph.createNode('COMPONENT', set.id, { name: 'State=Off', width: 40, height: 20 })
    graph.createNode('RECTANGLE', off.id, { name: 'Knob', x: 0, width: 20, height: 20 })
    const on = graph.createNode('COMPONENT', set.id, {
      name: 'State=On',
      x: 60,
      width: 40,
      height: 20
    })
    graph.createNode('RECTANGLE', on.id, { name: 'Knob', x: 20, width: 20, height: 20 })
    const screen = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
    const instance = graph.createInstance(off.id, screen.id)
    if (!instance) throw new Error('no instance')
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const scope = effectScope()
    const wired = scope.run(() => {
      const smart = usePlaySmartAnimate(store)
      const play = usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 })),
        {
          onAnimation: (animation, ms) => smart.start(animation, ms),
          onAnimationStopped: () => smart.stop()
        }
      )
      return { play, views: () => smart.views(play.views()) }
    })
    if (!wired) throw new Error('no wiring')
    const changeTo = (
      nodeId: string,
      type: 'SMART_ANIMATE' | 'INSTANT',
      duration: number
    ): PrototypeNodeAction => ({
      type: 'NODE',
      nodeId,
      navigation: 'CHANGE_TO',
      transition: { type, duration, easing: 'LINEAR' },
      overlayPosition: 'CENTER'
    })
    const shownVariant = () => {
      const drawn = wired.views().get(screen.id)?.graph ?? graph
      const node = drawn.getNode(instance.id)
      return node ? instanceMainComponent(drawn, node)?.id : undefined
    }

    const smartAction = changeTo(on.id, 'SMART_ANIMATE', 0.5)
    wired.play.run({
      sourceId: instance.id,
      action: smartAction,
      transition: smartAction.transition
    })
    step(100)
    expect(shownVariant()).toBe(on.id)

    wired.play.run({
      sourceId: instance.id,
      action: changeTo(off.id, 'INSTANT', 0),
      transition: null
    })

    // The canvas draws Off now, not the On animation's copy for 400 more ms.
    expect(shownVariant()).toBe(off.id)
    scope.stop()
    store.dispose()
  })
})
