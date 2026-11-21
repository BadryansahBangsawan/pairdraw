import { afterEach, describe, expect, test } from 'bun:test'

import { computed, effectScope, ref } from 'vue'

import { startSession, shownFrame, type PlaySession } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { createPlayPointer } from '@/app/editor/prototype/pointer'
import { usePlayScenes, type PlayScenesOptions } from '@/app/editor/prototype/scenes'
import { createEditorStore } from '@/app/editor/session'

type Trigger = PrototypeReaction['trigger']['type']

function changeTo(variantId: string, trigger: Trigger, delay = 0): PrototypeReaction {
  return {
    id: `${trigger}-${variantId}`,
    trigger: { type: trigger, delay },
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

/** A reaction that opens `nodeId` as an overlay on `trigger`. */
function openOverlay(nodeId: string, trigger: Trigger): PrototypeReaction {
  return {
    id: `${trigger}-overlay`,
    trigger: { type: trigger, delay: 0 },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation: 'OVERLAY',
        transition: { type: 'INSTANT', duration: 0 },
        overlayPosition: 'CENTER'
      }
    ]
  }
}

/** A button set (Default, Hover, Pressed, Lit) and a 200×200 screen with a button at 10,10. */
function buttonDocument(
  reactions: (ids: { hover: string; pressed: string; lit: string }) => PrototypeReaction[]
) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 500 })
  const variant = (name: string, x: number) =>
    graph.createNode('COMPONENT', set.id, { name, x, width: 40, height: 20 })
  const base = variant('State=Default', 0)
  const hover = variant('State=Hover', 50)
  const pressed = variant('State=Pressed', 100)
  const lit = variant('State=Lit', 150)
  graph.updateNode(base.id, {
    prototypeReactions: reactions({ hover: hover.id, pressed: pressed.id, lit: lit.id })
  })
  const screen = graph.createNode('FRAME', pageId, { width: 200, height: 200 })
  const button = graph.createInstance(base.id, screen.id, { x: 10, y: 10 })
  if (!button) throw new Error('no button')
  return { graph, screen, button, base, hover, pressed, lit }
}

function setUp(document: ReturnType<typeof buttonDocument>, options?: PlayScenesOptions) {
  const store = createEditorStore(document.graph)
  const session = ref<PlaySession | null>(startSession(document.screen.id))
  const scope = effectScope()
  const live = computed(() => ({ revision: 0 }))
  const parts = scope.run(() => {
    const play = usePlayScenes(store, session, live, options)
    return { play, pointer: createPlayPointer(session, play) }
  })
  if (!parts) throw new Error('no play')
  const shows = () => {
    const played = parts.play.graphFor(document.screen.id)
    const node = played.getNode(document.button.id)
    return node ? instanceMainComponent(played, node)?.id : undefined
  }
  return {
    ...parts,
    session,
    shows,
    stop: () => {
      scope.stop()
      store.dispose()
    }
  }
}

const OVER = { x: 20, y: 20 }
const AWAY = { x: 150, y: 150 }

describe('the pointer in play', () => {
  let restore: (() => void) | null = null
  afterEach(() => {
    restore?.()
    restore = null
  })

  test('While hovering shows its variant while the pointer stays over the instance', () => {
    const document = buttonDocument(({ hover }) => [changeTo(hover, 'ON_HOVER')])
    const { pointer, shows, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(shows()).toBe(document.hover.id)
    pointer.move(OVER.x + 2, OVER.y)
    expect(shows()).toBe(document.hover.id)
    pointer.move(AWAY.x, AWAY.y)
    expect(shows()).toBe(document.base.id)
    pointer.move(OVER.x, OVER.y)
    pointer.leaveAll()
    expect(shows()).toBe(document.base.id)
    stop()
  })

  test('a While hovering Navigate reports the transition length', () => {
    const document = buttonDocument(() => [])
    const pageId = document.graph.getPages()[0].id
    const target = document.graph.createNode('FRAME', pageId, {
      x: 400,
      width: 200,
      height: 200
    })
    document.graph.updateNode(document.base.id, {
      prototypeReactions: [
        {
          id: 'hover-navigate',
          trigger: { type: 'ON_HOVER', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: target.id,
              navigation: 'NAVIGATE',
              transition: { type: 'DISSOLVE', duration: 0.5 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    const durations: number[] = []
    const { pointer, session, stop } = setUp(document, {
      onFrameTransition: (durationMs) => durations.push(durationMs)
    })

    pointer.move(OVER.x, OVER.y)

    const current = session.value
    if (!current) throw new Error('play ended')
    expect(shownFrame(current)).toBe(target.id)
    expect(durations).toEqual([500])
    stop()
  })

  test('a While hovering overlay closes when the pointer leaves its trigger', () => {
    const document = buttonDocument(() => [])
    const pageId = document.graph.getPages()[0].id
    const tooltip = document.graph.createNode('FRAME', pageId, {
      x: 400,
      width: 50,
      height: 20
    })
    document.graph.updateNode(document.base.id, {
      prototypeReactions: [openOverlay(tooltip.id, 'ON_HOVER')]
    })
    const { pointer, session, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(session.value?.overlays).toEqual([tooltip.id])
    pointer.move(OVER.x + 2, OVER.y)
    expect(session.value?.overlays).toEqual([tooltip.id])
    pointer.move(AWAY.x, AWAY.y)
    expect(session.value?.overlays).toEqual([])
    stop()
  })

  test('a closed hover overlay does not close a later click-opened overlay', () => {
    const document = buttonDocument(() => [])
    const pageId = document.graph.getPages()[0].id
    const tooltip = document.graph.createNode('FRAME', pageId, {
      x: 400,
      width: 50,
      height: 20
    })
    document.graph.updateNode(document.base.id, {
      prototypeReactions: [openOverlay(tooltip.id, 'ON_HOVER')]
    })
    const { pointer, session, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(session.value?.overlays).toEqual([tooltip.id])

    // Close the hover overlay, then open the same frame by a click.
    const hovered = session.value
    if (!hovered) throw new Error('no session')
    session.value = { ...hovered, overlays: [] }
    pointer.reset()
    const closed = session.value
    if (!closed) throw new Error('no session')
    session.value = { ...closed, overlays: [tooltip.id] }
    pointer.move(AWAY.x, AWAY.y)

    expect(session.value?.overlays).toEqual([tooltip.id])
    stop()
  })

  test('a hover overlay under a click overlay closes when its trigger is left', () => {
    const document = buttonDocument(() => [])
    const pageId = document.graph.getPages()[0].id
    const tooltip = document.graph.createNode('FRAME', pageId, {
      x: 400,
      width: 50,
      height: 20
    })
    const clickOverlay = document.graph.createNode('FRAME', pageId, {
      x: 500,
      width: 50,
      height: 20
    })
    document.graph.updateNode(document.base.id, {
      prototypeReactions: [openOverlay(tooltip.id, 'ON_HOVER')]
    })
    const { pointer, session, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    const hovered = session.value
    if (!hovered) throw new Error('no session')
    session.value = { ...hovered, overlays: [tooltip.id, clickOverlay.id] }

    pointer.move(AWAY.x, AWAY.y)

    expect(session.value?.overlays).toEqual([clickOverlay.id])
    stop()
  })

  test('a nested instance trigger opens and closes its overlay', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const set = graph.createNode('COMPONENT_SET', pageId, { y: 500 })
    const inner = graph.createNode('COMPONENT', set.id, { width: 40, height: 20 })
    const outer = graph.createNode('COMPONENT', pageId, { width: 100, height: 100 })
    graph.createInstance(inner.id, outer.id, { x: 10, y: 10 })
    const screen = graph.createNode('FRAME', pageId, { width: 200, height: 200 })
    graph.createInstance(outer.id, screen.id)
    const tooltip = graph.createNode('FRAME', pageId, { x: 400, width: 50, height: 20 })
    graph.updateNode(inner.id, {
      prototypeReactions: [openOverlay(tooltip.id, 'ON_HOVER')]
    })
    const store = createEditorStore(graph)
    const session = ref<PlaySession | null>(startSession(screen.id))
    const scope = effectScope()
    const live = computed(() => ({ revision: 0 }))
    const parts = scope.run(() => {
      const play = usePlayScenes(store, session, live)
      return { play, pointer: createPlayPointer(session, play) }
    })
    if (!parts) throw new Error('no play')

    parts.pointer.move(20, 20)
    expect(session.value?.overlays).toEqual([tooltip.id])
    parts.pointer.move(100, 100)
    expect(session.value?.overlays).toEqual([])
    scope.stop()
    store.dispose()
  })

  test('a While pressing overlay closes when the pointer lifts', () => {
    const document = buttonDocument(() => [])
    const pageId = document.graph.getPages()[0].id
    const tooltip = document.graph.createNode('FRAME', pageId, {
      x: 400,
      width: 50,
      height: 20
    })
    document.graph.updateNode(document.base.id, {
      prototypeReactions: [openOverlay(tooltip.id, 'ON_PRESS')]
    })
    const { pointer, session, stop } = setUp(document)
    pointer.press(OVER.x, OVER.y)
    expect(session.value?.overlays).toEqual([tooltip.id])
    pointer.release()
    expect(session.value?.overlays).toEqual([])
    stop()
  })

  test('While pressing shows its variant until the pointer lifts', () => {
    const document = buttonDocument(({ pressed }) => [changeTo(pressed, 'ON_PRESS')])
    const { pointer, shows, stop } = setUp(document)
    pointer.press(OVER.x, OVER.y)
    expect(shows()).toBe(document.pressed.id)
    pointer.release()
    expect(shows()).toBe(document.base.id)
    pointer.press(AWAY.x, AWAY.y)
    expect(shows()).toBe(document.base.id)
    stop()
  })

  test('Mouse enter waits its delay, and the pointer leaving first cancels it', () => {
    if (globalThis.window === undefined) Object.assign(globalThis, { window: globalThis })
    const realSet = window.setTimeout
    const realClear = window.clearTimeout
    const armed: { fn: () => void; cleared: boolean }[] = []
    window.setTimeout = ((fn: () => void) => {
      armed.push({ fn, cleared: false })
      return armed.length
    }) as typeof window.setTimeout
    window.clearTimeout = ((id: number) => {
      const entry = armed[id - 1]
      if (entry) entry.cleared = true
    }) as typeof window.clearTimeout
    restore = () => {
      window.setTimeout = realSet
      window.clearTimeout = realClear
    }
    const document = buttonDocument(({ lit }) => [changeTo(lit, 'MOUSE_ENTER', 0.5)])
    const { pointer, shows, stop } = setUp(document)

    pointer.move(OVER.x, OVER.y)
    expect(shows()).toBe(document.base.id)
    pointer.move(AWAY.x, AWAY.y)
    expect(armed.at(-1)?.cleared).toBe(true)

    pointer.move(OVER.x, OVER.y)
    armed.at(-1)?.fn()
    expect(shows()).toBe(document.lit.id)
    // Mouse enter is no While hovering: leaving keeps the variant.
    pointer.move(AWAY.x, AWAY.y)
    expect(shows()).toBe(document.lit.id)
    stop()
  })

  test('Mouse leave runs as the pointer leaves the instance', () => {
    const document = buttonDocument(({ lit }) => [changeTo(lit, 'MOUSE_LEAVE')])
    const { pointer, shows, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(shows()).toBe(document.base.id)
    pointer.move(AWAY.x, AWAY.y)
    expect(shows()).toBe(document.lit.id)
    stop()
  })

  test('another frame showing puts a hovered variant back', () => {
    const document = buttonDocument(({ hover }) => [changeTo(hover, 'ON_HOVER')])
    const { pointer, shows, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(shows()).toBe(document.hover.id)
    pointer.reset()
    expect(shows()).toBe(document.base.id)
    stop()
  })

  test('While pressing goes back when the pointer leaves the canvas before it lifts', () => {
    const document = buttonDocument(({ pressed }) => [changeTo(pressed, 'ON_PRESS')])
    const { pointer, shows, stop } = setUp(document)
    pointer.press(OVER.x, OVER.y)
    expect(shows()).toBe(document.pressed.id)
    pointer.leaveAll()
    expect(shows()).toBe(document.base.id)
    stop()
  })

  test('a move still waiting for its frame does nothing once the pointer left', () => {
    const document = buttonDocument(({ hover }) => [changeTo(hover, 'ON_HOVER')])
    const store = createEditorStore(document.graph)
    const session = ref<PlaySession | null>(startSession(document.screen.id))
    const frames = new Map<number, () => void>()
    let next = 1
    const scope = effectScope()
    const parts = scope.run(() => {
      const play = usePlayScenes(
        store,
        session,
        computed(() => ({ revision: 0 }))
      )
      const pointer = createPlayPointer(session, play, {
        request: (callback) => {
          frames.set(next, callback)
          return next++
        },
        cancel: (id) => frames.delete(id)
      })
      return { play, pointer }
    })
    if (!parts) throw new Error('no play')
    parts.pointer.queueMove(OVER.x, OVER.y)
    parts.pointer.leaveAll()
    for (const callback of frames.values()) callback()
    const played = parts.play.graphFor(document.screen.id)
    const node = played.getNode(document.button.id)
    expect(node && instanceMainComponent(played, node)?.id).toBe(document.base.id)
    scope.stop()
    store.dispose()
  })

  test('leaving cancels every delayed Mouse enter of the layer', () => {
    if (globalThis.window === undefined) Object.assign(globalThis, { window: globalThis })
    const realSet = window.setTimeout
    const realClear = window.clearTimeout
    const armed: { fn: () => void; cleared: boolean }[] = []
    window.setTimeout = ((fn: () => void) => {
      armed.push({ fn, cleared: false })
      return armed.length
    }) as typeof window.setTimeout
    window.clearTimeout = ((id: number) => {
      const entry = armed[id - 1]
      if (entry) entry.cleared = true
    }) as typeof window.clearTimeout
    restore = () => {
      window.setTimeout = realSet
      window.clearTimeout = realClear
    }
    const document = buttonDocument(({ hover, lit }) => [
      changeTo(lit, 'MOUSE_ENTER', 0.5),
      { ...changeTo(hover, 'MOUSE_ENTER', 2), id: 'slow-enter' }
    ])
    const { pointer, stop } = setUp(document)
    pointer.move(OVER.x, OVER.y)
    expect(armed).toHaveLength(2)
    pointer.move(AWAY.x, AWAY.y)
    expect(armed.map((timer) => timer.cleared)).toEqual([true, true])
    stop()
  })
})
