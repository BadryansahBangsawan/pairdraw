import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'

import {
  createPlayScenes,
  type PlayClick,
  type PlayRevert,
  type PlaySession,
  type PlayStep,
  type PlayTimeout,
  shownFrame
} from '@pairdraw/core/prototype'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'

/** What the stage reads of play: whether it runs, and the Reset count that starts it over. */
type PlayLive = Readonly<Ref<{ revision: number } | null>>

/**
 * The frames a playing prototype changed, for one canvas: a Change to switches an instance on
 * its frame's private copy, which the canvas draws instead of the document. Reset, leaving play,
 * another document, and an edit inside a changed frame put it back as designed. The After delay
 * reactions of the instances on screen run here too, each counting from when its instance began
 * to show the variant whose reaction it is.
 */
export function usePlayScenes(
  store: EditorStore,
  session: Ref<PlaySession | null>,
  live: PlayLive
) {
  const scenes = createPlayScenes(() => store.graph)
  /** Grows whenever what play shows of a frame changes, so timers and the canvas follow. */
  const revision = shallowRef(0)

  function changed(): void {
    revision.value += 1
    store.requestRepaint()
  }

  /** Runs a reaction of a layer in `rootId`, the shown frame unless a timer names another. */
  function run(click: PlayClick, rootId?: string): PlayStep | null {
    const current = session.value
    if (!current) return null
    const result = scenes.run(current, click, rootId)
    session.value = result.session
    if (result.changed) changed()
    return result
  }

  /** Undoes a While hovering or While pressing reaction as the pointer leaves or lifts. */
  function revert(undo: PlayRevert): void {
    const current = session.value
    if (!current) return
    const result = scenes.revert(current, undo)
    session.value = result.session
    if (result.changed) changed()
  }

  /**
   * Scrolls the frames under the pointer by a wheel or drag, innermost first, and returns what
   * none of them could take, which the canvas pans by instead.
   */
  function scrollBy(path: readonly string[], dx: number, dy: number): Vector {
    const current = session.value
    if (!current) return { x: dx, y: dy }
    const rest = scenes.scrollBy(shownFrame(current), path, dx, dy)
    if (rest.x !== dx || rest.y !== dy) store.requestRepaint()
    return rest
  }

  function clear(): void {
    if (scenes.views.size === 0 && scenes.scroll.size === 0) return
    scenes.clear()
    changed()
  }

  watch(() => live.value?.revision ?? null, clear)

  // A layer edited, added, or removed inside a changed frame puts that frame back as designed.
  function forget(ids: string[]): void {
    const before = scenes.views.size
    scenes.forget(ids)
    if (scenes.views.size !== before) changed()
  }
  function follow(graph: SceneGraph): () => void {
    return graph.onNodeEvents({
      created: (node) => forget([node.id]),
      updated: (id) => forget([id]),
      deleted: (id, parentId) => forget(parentId ? [id, parentId] : [id])
    })
  }
  let stopFollowing = follow(store.graph)
  const stopReplacing = store.onEditorEvent('graph:replaced', (graph) => {
    stopFollowing()
    stopFollowing = follow(graph)
    clear()
  })

  const timers = new Map<string, number>()
  function armInstanceTimers(): void {
    const current = session.value
    const wanted = new Map<string, PlayTimeout & { rootId: string }>()
    if (current && live.value) {
      for (const rootId of [current.frameId, ...current.overlays]) {
        scenes.instanceTimeouts(rootId).forEach((timeout, index) => {
          const key = `${live.value?.revision}:${rootId}:${timeout.sourceId}:${timeout.variantId}:${index}`
          wanted.set(key, { ...timeout, rootId })
        })
      }
    }
    for (const [key, timer] of timers) {
      if (wanted.has(key)) continue
      window.clearTimeout(timer)
      timers.delete(key)
    }
    for (const [key, timeout] of wanted) {
      if (timers.has(key)) continue
      const timer = window.setTimeout(() => {
        timers.delete(key)
        const graph = scenes.graphFor(timeout.rootId)
        const instance = graph.getNode(timeout.sourceId)
        // A timer that outlived its instance's variant, or its frame, runs nothing.
        if (!instance || instanceMainComponent(graph, instance)?.id !== timeout.variantId) return
        const { sourceId, action } = timeout
        run({ sourceId, action, transition: null }, timeout.rootId)
      }, timeout.delayMs)
      timers.set(key, timer)
    }
  }
  watch(
    () => {
      const current = session.value
      if (!current || !live.value) return null
      const frames = [current.frameId, ...current.overlays].join(',')
      return `${live.value.revision}:${revision.value}:${frames}`
    },
    armInstanceTimers,
    { immediate: true }
  )

  onScopeDispose(() => {
    for (const timer of timers.values()) window.clearTimeout(timer)
    timers.clear()
    stopFollowing()
    stopReplacing()
  })

  return {
    /** The changed frames the canvas draws from their copies. */
    views: () => scenes.views,
    graphFor: (rootId: string) => scenes.graphFor(rootId),
    /** How far play scrolled each frame's content, which the canvas and the pointer follow. */
    scroll: () => scenes.scroll,
    scrollBy,
    /** Grows whenever what play shows of a frame changes. */
    revision,
    run,
    revert
  }
}
