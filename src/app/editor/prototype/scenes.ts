import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'

import {
  animationFor,
  createPlayScenes,
  effectiveReactions,
  type PlayClick,
  type PlayRevert,
  type PlaySession,
  type PlayStep,
  type PlayTimeout,
  type ScrollChange,
  type SmartAnimation,
  shownFrame,
  transitionMs
} from '@pairdraw/core/prototype'
import type { PrototypeEasingType, SceneGraph } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'

/** How long an animated Scroll to eases, as long as a dissolve. */
const SCROLL_ANIMATION_MS = 300

/** What the stage reads of play: whether it runs, and the Reset count that starts it over. */
type PlayLive = Readonly<Ref<{ revision: number } | null>>

/** What the stage gives play, and what play tells the stage. */
export interface PlayScenesOptions {
  onReveal?: (reveal: Vector) => void
  /** Called before a dissolving reaction runs, to draw the frame as it was for the crossfade. */
  beforeDissolve?: (rootId: string, durationMs: number, easing?: PrototypeEasingType) => void
  /**
   * Called after a reaction changed the shown frame or overlay, with how long its transition takes.
   * The stage counts the next frame's After delays from the end of that transition.
   */
  onFrameTransition?: (durationMs: number) => void
  /** Called with a Smart animate Change to's animation, to play over its duration. */
  onAnimation?: (animation: SmartAnimation, durationMs: number) => void
  /** Called when a change brings no animation, to stop one still running over that frame. */
  onAnimationStopped?: (rootId?: string) => void
}

/**
 * The frames a playing prototype changed, for one canvas: a Change to switches an instance on
 * its frame's private copy, which the canvas draws instead of the document. Reset, leaving play,
 * another document, and an edit inside a changed frame put it back as designed. The After delay
 * reactions of the instances on screen run here too, each counting from when its instance began
 * to show the variant whose reaction it is. A Scroll to eases its frames when it animates, and
 * `onReveal` brings the layer it scrolled to into view on a screen that scrolls by panning.
 */
export function usePlayScenes(
  store: EditorStore,
  session: Ref<PlaySession | null>,
  live: PlayLive,
  options: PlayScenesOptions = {}
) {
  const scenes = createPlayScenes(() => store.graph)
  /** Grows whenever what play shows of a frame changes, so timers and the canvas follow. */
  const revision = shallowRef(0)

  function changed(): void {
    revision.value += 1
    store.requestRepaint()
  }

  /** Draws the frame as it was before a crossfade, but not for a Scroll to or a cut. */
  function dissolveBefore(current: PlaySession, click: PlayClick, rootId?: string): void {
    if (!click.transition) return
    if (animationFor(current, click.action) !== 'dissolve') return
    if (click.action.type === 'NODE' && click.action.navigation === 'SCROLL_TO') return
    const durationMs = transitionMs(click.action)
    options.beforeDissolve?.(rootId ?? shownFrame(current), durationMs, click.transition.easing)
  }

  /** Eases the frames a Scroll to moved, or shows them at once when it does not animate. */
  function showScrolled(click: PlayClick, scrolled: PlayStep['scrolled']): void {
    if (!scrolled?.length) return
    if (click.transition && click.transition.type !== 'INSTANT') animate(scrolled)
    else store.requestRepaint()
  }

  /** Runs a reaction of a layer in `rootId`, the shown frame unless a timer names another. */
  function run(click: PlayClick, rootId?: string): PlayStep | null {
    const current = session.value
    if (!current) return null
    dissolveBefore(current, click, rootId)
    const result = scenes.run(current, click, rootId)
    session.value = result.session
    if (!result.changed && result.session !== current) {
      options.onFrameTransition?.(transitionMs(click.action))
    }
    if (result.changed) changed()
    if (result.animation) options.onAnimation?.(result.animation, transitionMs(click.action))
    // A change with no animation of its own shows at once: a Smart animate still running over
    // the frame would draw its stale copy over what play now shows.
    else if (result.changed) options.onAnimationStopped?.(rootId ?? shownFrame(result.session))
    showScrolled(click, result.scrolled)
    if (result.reveal) options.onReveal?.(result.reveal)
    return result
  }

  // An animated Scroll to eases each frame it moved from where it was to where it ends.
  let tween: number | null = null
  function stopTween(): void {
    if (tween !== null) cancelAnimationFrame(tween)
    tween = null
  }
  function animate(moves: readonly ScrollChange[]): void {
    stopTween()
    const started = performance.now()
    const frame = (now: number) => {
      const t = Math.min(1, (now - started) / SCROLL_ANIMATION_MS)
      const eased = 1 - (1 - t) ** 3
      for (const { id, from, to } of moves) {
        scenes.setScroll(id, {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased
        })
      }
      store.requestRepaint()
      tween = t < 1 ? requestAnimationFrame(frame) : null
    }
    frame(started)
  }

  /** Undoes a While hovering or While pressing reaction as the pointer leaves or lifts. */
  function revert(undo: PlayRevert): void {
    const current = session.value
    if (!current) return
    const result = scenes.revert(current, undo)
    session.value = result.session
    if (result.changed) changed()
    if (result.animation && undo.kind === 'change' && undo.transition) {
      options.onAnimation?.(result.animation, undo.transition.duration * 1000)
    }
    // A revert with no animation shows the earlier variant at once, as a click's change does.
    else if (result.changed && undo.kind === 'change') options.onAnimationStopped?.()
  }

  /**
   * Scrolls the frames under the pointer by a wheel or drag, innermost first, and returns what
   * none of them could take, which the canvas pans by instead.
   */
  function scrollBy(path: readonly string[], dx: number, dy: number): Vector {
    const current = session.value
    if (!current) return { x: dx, y: dy }
    // The pointer takes over from an animated Scroll to.
    stopTween()
    const rest = scenes.scrollBy(shownFrame(current), path, dx, dy)
    if (rest.x !== dx || rest.y !== dy) store.requestRepaint()
    return rest
  }

  /** Takes one overlay away by frame, even when a later overlay is on top of it. */
  function closeOverlay(frameId: string): void {
    const current = session.value
    if (!current?.overlays.includes(frameId)) return
    session.value = {
      ...current,
      overlays: current.overlays.filter((id) => id !== frameId)
    }
    changed()
  }

  function clear(): void {
    stopTween()
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
        for (const timeout of scenes.instanceTimeouts(rootId)) {
          // By the reaction, not its place in the list, so another instance that stops counting
          // does not start this one over.
          const { sourceId, variantId, reactionId } = timeout
          const key = `${live.value.revision}:${rootId}:${sourceId}:${variantId}:${reactionId}`
          wanted.set(key, { ...timeout, rootId })
        }
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
        const layer = graph.getNode(timeout.sourceId)
        // A timer that outlived its instance's variant, its copy's main layer, or its frame runs
        // nothing.
        if (!layer) return
        if (layer.type === 'INSTANCE') {
          if (instanceMainComponent(graph, layer)?.id !== timeout.variantId) return
        } else if (
          !effectiveReactions(graph, layer).some(
            (reaction) =>
              reaction.id === timeout.reactionId && reaction.trigger.type === 'AFTER_TIMEOUT'
          )
        ) {
          return
        }
        const { sourceId, action } = timeout
        const transition = action.type === 'NODE' ? action.transition : null
        run({ sourceId, action, transition }, timeout.rootId)
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
    stopTween()
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
    revert,
    closeOverlay
  }
}
