/**
 * The one plugin that may take the next pointer sequence on the canvas. The canvas pushes each
 * document point in order, and the sequence settles on release with every point it saw, or clears
 * when the run gives it up or the user presses Escape. One holder at a time, so a second plugin
 * cannot take the drag away from the first.
 */
import { ref, shallowRef, type Ref } from 'vue'

import { createDeferred } from '@/app/runtime/deferred'

import { PLUGIN_POINTER_BUSY_MESSAGE, PLUGIN_POINTER_CANCELLED_MESSAGE } from '../messages'

/** One point a pointer sequence reached, in document coordinates. */
export interface PluginPointerPoint {
  x: number
  y: number
}

/** What one run may ask of the canvas: its sequences end together when the user cancels one. */
export interface PluginPointerAccess {
  /** The next sequence, or `null` when the user cancelled this one. */
  request(): Promise<PluginPointerPoint[] | null>
  /** Frees the pointer if this run still holds it; the run is over. */
  release(): void
}

interface PointerRun {
  cancelled: boolean
}

interface HeldSequence {
  id: string
  points: PluginPointerPoint[]
  settle: (sequence: PluginPointerPoint[] | null) => void
  run: PointerRun
  /** The document the sequence was taken on; `null` for a caller that names none, as tests do. */
  owner: object | null
}

let held: HeldSequence | null = null

/** The plugin holding the pointer, or `null`; the canvas shows its capture layer while set. */
export const pluginPointerHolder: Ref<string | null> = ref(null)

/**
 * The document the pointer was taken on, by identity. Only that document's canvases show the
 * capture layer and feed the sequence; another document's canvas leaves the drag to the editor.
 */
export const pluginPointerOwner = shallowRef<object | null>(null)

function release(): void {
  held = null
  pluginPointerHolder.value = null
  pluginPointerOwner.value = null
}

/**
 * Opens the pointer for one run. A sequence the user cancels closes the pointer for that run:
 * every later request is refused, so a plugin that asks again cannot take the canvas back and
 * instead burns its run deadline. Sequences the user completes keep working, and a new run gets
 * its own access.
 */
export function beginPluginPointer(id: string, owner: object | null = null): PluginPointerAccess {
  const run: PointerRun = { cancelled: false }
  return {
    request() {
      if (run.cancelled) return Promise.reject(new Error(PLUGIN_POINTER_CANCELLED_MESSAGE))
      if (held) return Promise.reject(new Error(PLUGIN_POINTER_BUSY_MESSAGE))
      const { promise, resolve } = createDeferred<PluginPointerPoint[] | null>()
      held = { id, points: [], settle: resolve, run, owner }
      pluginPointerHolder.value = id
      pluginPointerOwner.value = owner
      return promise
    },
    release() {
      if (held?.run === run) drop()
    }
  }
}

/** Adds one document point to the sequence in progress; with no holder the point is ignored. */
export function addPluginPointerPoint(point: PluginPointerPoint): void {
  held?.points.push(point)
}

/** Ends the sequence with what it collected, and frees the pointer. */
export function endPluginPointer(): void {
  if (!held) return
  const points = [...held.points]
  const settle = held.settle
  release()
  settle(points)
}

function drop(): void {
  if (!held) return
  const settle = held.settle
  release()
  settle(null)
}

/** Drops the sequence the user cancelled, and closes the pointer for the run that asked. */
export function cancelPluginPointer(): void {
  if (!held) return
  held.run.cancelled = true
  drop()
}

/**
 * Cancels the sequence a run holds on `owner`, and nothing when the pointer is another
 * document's or free. A document leaving the screen uses this, so its run ends with a cancelled
 * sequence instead of keeping the canvas and the one run slot.
 */
export function cancelPluginPointerFor(owner: object): void {
  if (held?.owner !== owner) return
  cancelPluginPointer()
}
