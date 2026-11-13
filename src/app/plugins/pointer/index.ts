/**
 * The one plugin that may take the next pointer sequence on the canvas. The canvas pushes each
 * document point in order, and the sequence settles on release with every point it saw, or clears
 * when the run gives it up or the user presses Escape. One holder at a time, so a second plugin
 * cannot take the drag away from the first.
 */
import { ref, type Ref } from 'vue'

import { createDeferred } from '@/app/runtime/deferred'

import { PLUGIN_POINTER_BUSY_MESSAGE } from '../messages'

/** One point a pointer sequence reached, in document coordinates. */
export interface PluginPointerPoint {
  x: number
  y: number
}

interface HeldSequence {
  id: string
  points: PluginPointerPoint[]
  settle: (sequence: PluginPointerPoint[] | null) => void
}

let held: HeldSequence | null = null

/** The plugin holding the pointer, or `null`; the canvas shows its capture layer while set. */
export const pluginPointerHolder: Ref<string | null> = ref(null)

function release(): void {
  held = null
  pluginPointerHolder.value = null
}

/**
 * Asks for the next pointer sequence for one plugin run. A second plugin asking while the first
 * holds it is refused rather than queued: the canvas has one pointer.
 */
export function requestPluginPointer(id: string): Promise<PluginPointerPoint[] | null> {
  if (held) return Promise.reject(new Error(PLUGIN_POINTER_BUSY_MESSAGE))
  const { promise, resolve } = createDeferred<PluginPointerPoint[] | null>()
  held = { id, points: [], settle: resolve }
  pluginPointerHolder.value = id
  return promise
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

/** Drops the sequence: Escape, a cancelled pointer, or a run that ended while it held the pointer. */
export function cancelPluginPointer(): void {
  if (!held) return
  const settle = held.settle
  release()
  settle(null)
}

/** Frees the pointer only when `id` is the holder, so a later holder keeps its sequence. */
export function releasePluginPointer(id: string): void {
  if (held?.id === id) cancelPluginPointer()
}
