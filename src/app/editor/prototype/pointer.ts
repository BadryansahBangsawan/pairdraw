import { useEventListener } from '@vueuse/core'
import { onScopeDispose, watch, type Ref } from 'vue'

import {
  effectiveReactions,
  hasPointerTriggers,
  pathChanges,
  pointerPath,
  pointerReactions,
  reactionAt,
  revertFor,
  shownFrame,
  type PlayClick,
  type PlayPointerReaction,
  type PlayRevert,
  type PlaySession,
  type PlayStep
} from '@pairdraw/core/prototype'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'

/** What the pointer needs of play: the graph a frame shows, and running and undoing reactions. */
export interface PointerPlay {
  graphFor: (rootId: string) => SceneGraph
  scroll: () => ReadonlyMap<string, Vector>
  run: (click: PlayClick) => PlayStep | null
  revert: (undo: PlayRevert) => void
  readonly revision: Readonly<Ref<number>>
}

/** Runs a callback on the next frame, and cancels one, as `requestAnimationFrame` does. */
export interface FrameScheduler {
  request: (callback: () => void) => number
  cancel: (id: number) => void
}

const ANIMATION_FRAMES: FrameScheduler = {
  request: (callback) => requestAnimationFrame(() => callback()),
  cancel: (id) => cancelAnimationFrame(id)
}

/**
 * The pointer's part in play: While hovering and Mouse enter run as it enters a layer, Mouse
 * leave as it leaves one, While pressing as it presses, and While hovering and While pressing
 * undo themselves as it leaves or lifts. A frame with none of these reactions is not hit-tested
 * as the pointer moves.
 */
export function createPlayPointer(
  session: Ref<PlaySession | null>,
  play: PointerPlay,
  frames: FrameScheduler = ANIMATION_FRAMES
) {
  /** The layers under the pointer, from the shown frame down. */
  let path: string[] = []
  let pathRoot: string | null = null
  const hovering: PlayRevert[] = []
  const pressing: PlayRevert[] = []
  /** The Mouse enter and Mouse leave timers waiting, by `enter:` or `leave:` and the layer. */
  const delayed = new Map<string, number[]>()
  /** A move waiting for the next frame, and where to. */
  let queued: number | null = null
  let latest: Vector | null = null

  function runNow(reaction: PlayClick, undoes?: PlayRevert[]): void {
    const before = session.value
    const done = play.run(reaction)
    if (!before || !done || !undoes) return
    const undo = revertFor(before, done, reaction, play.graphFor(shownFrame(before)))
    if (undo) undoes.push(undo)
  }

  /** Runs now, or once a Mouse enter or Mouse leave's delay passes unless the pointer moves back. */
  function runAfterDelay(key: string, reaction: PlayPointerReaction): void {
    if (reaction.delayMs <= 0) return runNow(reaction)
    const timer = window.setTimeout(() => {
      const waiting = delayed.get(key)?.filter((other) => other !== timer) ?? []
      if (waiting.length > 0) delayed.set(key, waiting)
      else delayed.delete(key)
      runNow(reaction)
    }, reaction.delayMs)
    delayed.set(key, [...(delayed.get(key) ?? []), timer])
  }

  /** Cancels every timer a layer's Mouse enter, or Mouse leave, has waiting. */
  function cancelDelayed(key: string): void {
    for (const timer of delayed.get(key) ?? []) window.clearTimeout(timer)
    delayed.delete(key)
  }

  /** Undoes the newest first, every one or those `watchId` keeps. */
  function undo(undoes: PlayRevert[], watchId?: string): void {
    const due = undoes.filter((entry) => watchId === undefined || entry.watchId === watchId)
    for (const entry of due) undoes.splice(undoes.indexOf(entry), 1)
    for (const entry of due.reverse()) play.revert(entry)
  }

  function enter(graph: SceneGraph, id: string): void {
    cancelDelayed(`leave:${id}`)
    for (const reaction of pointerReactions(graph, id, 'ON_HOVER')) runNow(reaction, hovering)
    for (const reaction of pointerReactions(graph, id, 'MOUSE_ENTER')) {
      runAfterDelay(`enter:${id}`, reaction)
    }
  }

  function leave(graph: SceneGraph, id: string): void {
    cancelDelayed(`enter:${id}`)
    undo(hovering, id)
    for (const reaction of pointerReactions(graph, id, 'MOUSE_LEAVE')) {
      runAfterDelay(`leave:${id}`, reaction)
    }
  }

  function follow(next: string[]): void {
    const current = session.value
    if (!current) return
    const graph = play.graphFor(shownFrame(current))
    const { left, entered } = pathChanges(path, next)
    path = next
    for (const id of left) leave(graph, id)
    for (const id of entered) enter(play.graphFor(shownFrame(current)), id)
  }

  /** The pointer at a document point: what it left and entered since it last moved. */
  function move(x: number, y: number): void {
    const current = session.value
    if (!current) return
    const rootId = shownFrame(current)
    const graph = play.graphFor(rootId)
    if (pathRoot !== rootId) reset()
    pathRoot = rootId
    // A layer with a reaction takes the pointer, and so does one a While hovering keeps showing,
    // whose new variant may have none.
    const takes = (node: SceneNode) =>
      hovering.some((entry) => entry.watchId === node.id) ||
      effectiveReactions(graph, node).length > 0
    follow(pointerPath(graph, rootId, x, y, play.scroll(), takes))
  }

  /** Moves the pointer on the next frame, so a burst of moves hit-tests once. */
  function queueMove(x: number, y: number): void {
    latest = { x, y }
    if (queued !== null) return
    queued = frames.request(() => {
      queued = null
      if (latest) move(latest.x, latest.y)
    })
  }

  function cancelQueuedMove(): void {
    if (queued !== null) frames.cancel(queued)
    queued = null
    latest = null
  }

  /**
   * The pointer gone from the canvas: it leaves every layer it was over, lets go of what it
   * pressed, and a move still waiting for its frame does nothing.
   */
  function leaveAll(): void {
    cancelQueuedMove()
    follow([])
    release()
  }

  function press(x: number, y: number): void {
    const current = session.value
    if (!current) return
    const graph = play.graphFor(shownFrame(current))
    const hit = reactionAt(graph, current, x, y, 'ON_PRESS', play.scroll())
    if (hit) runNow(hit, pressing)
  }

  function release(): void {
    undo(pressing)
  }

  /**
   * Forgets the pointer, as when another frame shows or play starts over: a variant it switched
   * goes back, while an overlay or a frame it opened stays, since the pointer can no longer leave
   * the layer that opened it.
   */
  function reset(): void {
    cancelQueuedMove()
    for (const timers of delayed.values()) for (const timer of timers) window.clearTimeout(timer)
    delayed.clear()
    for (const undoes of [hovering, pressing]) {
      const changes = undoes.filter((entry) => entry.kind === 'change')
      undoes.length = 0
      for (const entry of changes.reverse()) play.revert(entry)
    }
    path = []
    pathRoot = null
  }

  return { move, queueMove, leaveAll, press, release, reset }
}

/** Wires the play pointer to the canvas, sampling a moving pointer once per frame. */
export function usePlayPointer(
  store: EditorStore,
  area: Ref<HTMLCanvasElement | null>,
  session: Ref<PlaySession | null>,
  play: PointerPlay,
  live: Readonly<Ref<{ revision: number } | null>>
) {
  const pointer = createPlayPointer(session, play)
  let tracking = false
  watch(
    () => {
      const current = session.value
      if (!current || !live.value) return null
      return `${live.value.revision}:${play.revision.value}:${shownFrame(current)}`
    },
    (key) => {
      const current = session.value
      tracking =
        !!key &&
        !!current &&
        hasPointerTriggers(play.graphFor(shownFrame(current)), shownFrame(current))
    },
    { immediate: true }
  )
  watch(
    () => {
      const current = session.value
      return current && live.value ? `${live.value.revision}:${shownFrame(current)}` : null
    },
    () => pointer.reset()
  )

  function documentPoint(event: PointerEvent): Vector | null {
    if (!session.value || !(event.target instanceof HTMLCanvasElement)) return null
    const bounds = event.target.getBoundingClientRect()
    return store.screenToCanvas(event.clientX - bounds.left, event.clientY - bounds.top)
  }

  useEventListener(area, 'pointermove', (event: PointerEvent) => {
    if (!tracking) return
    const point = documentPoint(event)
    if (point) pointer.queueMove(point.x, point.y)
  })
  useEventListener(area, 'pointerleave', () => pointer.leaveAll())
  useEventListener(area, 'pointerdown', (event: PointerEvent) => {
    const point = documentPoint(event)
    if (point) pointer.press(point.x, point.y)
  })
  // A press lifts wherever the pointer is by then, on the canvas or off it.
  useEventListener(window, 'pointerup', () => pointer.release())
  useEventListener(window, 'pointercancel', () => pointer.release())

  onScopeDispose(() => pointer.reset())
}
