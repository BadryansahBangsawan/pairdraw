import { promiseTimeout } from '@vueuse/core'

import { currentRun } from '@/app/ai/reply/run'
import type { EditorStore } from '@/app/editor/active-store'

import { renderToolChangeImages, type ChangeRegion } from './images'
import { setToolChange } from './store'
import type { ToolChange } from './types'

/** Quiet time after a reply's last edit before a preview renders, so the next call goes first. */
export const CHANGE_PREVIEW_PAUSE_MS = 150

interface PreviewJob {
  change: ToolChange
  region: ChangeRegion
}

interface PreviewQueue {
  jobs: PreviewJob[]
  cancelled: boolean
  /** Settles once the queue has nothing left to render. */
  drained: Promise<void> | null
}

const queues = new WeakMap<EditorStore, PreviewQueue>()

/** Waits until no call of the document's reply is editing, and has not been for a moment. */
async function quiet(store: EditorStore): Promise<void> {
  for (;;) {
    await currentRun(store).settled()
    await promiseTimeout(CHANGE_PREVIEW_PAUSE_MS)
    if (!currentRun(store).editing) return
  }
}

async function render(store: EditorStore, queue: PreviewQueue, { change, region }: PreviewJob) {
  try {
    const images = await renderToolChangeImages(store, region)
    if (images && !queue.cancelled) setToolChange({ ...change, images })
  } catch (error) {
    console.warn('Could not render AI change previews', error)
  }
}

async function drain(store: EditorStore, queue: PreviewQueue): Promise<void> {
  // Read again after each wait: the document may close meanwhile.
  const cancelled = () => queue.cancelled
  try {
    while (queue.jobs.length > 0 && !cancelled()) {
      await quiet(store)
      const job = queue.jobs.shift()
      if (!job || cancelled()) return
      await render(store, queue, job)
      // Input and drawing go between one preview and the next.
      await promiseTimeout(0)
    }
  } finally {
    queue.drained = null
  }
}

/** Drops the document's pending previews as it closes; one already drawing is not kept. */
function cancelChangePreviews(store: EditorStore): void {
  const queue = queues.get(store)
  if (!queue) return
  queue.cancelled = true
  queue.jobs.length = 0
  queues.delete(store)
}

/**
 * Renders a change's preview images once the document's reply is between tool calls, one
 * preview at a time, so drawing them never holds up an edit.
 */
export function queueChangePreview(store: EditorStore, change: ToolChange, region: ChangeRegion) {
  let queue = queues.get(store)
  if (!queue) {
    queue = { jobs: [], cancelled: false, drained: null }
    queues.set(store, queue)
    store.onDispose(() => cancelChangePreviews(store))
  }
  queue.jobs.push({ change, region })
  queue.drained ??= drain(store, queue)
}

/** Resolves once every preview queued for the document has rendered or was dropped. */
export function changePreviewsDrained(store: EditorStore): Promise<void> {
  return queues.get(store)?.drained ?? Promise.resolve()
}
