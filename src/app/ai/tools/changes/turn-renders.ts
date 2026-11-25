import { promiseTimeout } from '@vueuse/core'

import type { FigmaAPI } from '@pairdraw/core/figma-api'
import { extractExportGraph } from '@pairdraw/core/io'
import { layoutFrameAtWidth, widthVariants } from '@pairdraw/core/tools'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { currentRun } from '@/app/ai/reply/run'
import { boundedImageScale } from '@/app/ai/tools/vision/inspect'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import type { EditorStore } from '@/app/editor/active-store'

import type { TurnFrame, TurnFrameCapture } from './frames'
import {
  freeTurnRendersOf,
  onTurnRendersFreed,
  setTurnRenders,
  type TurnFrameRenders,
  type TurnFrameSummary,
  type TurnFrameWidth
} from './turn-store'

/** Quiet time after a reply's last edit before turn renders start, as per-call previews do. */
export const TURN_RENDER_PAUSE_MS = 150

/** Longest stored edge of a turn render, in pixels. */
const TURN_RENDER_MAX_EDGE = 320

/**
 * Width renders one turn may still draw. A turn shows at most 3 frames, whose before/after
 * images already spend 6 of the spec's 10-render budget; the remaining 4 are two widths for
 * two responsive frames, and later frames keep their thumbnails only.
 */
const MAX_WIDTH_RENDERS_PER_TURN = 4

interface FrozenFrame extends TurnFrame {
  /** The frame's subtree at turn end; null when the turn deleted it. */
  after: SceneGraph | null
}

interface TurnJob {
  messageId: string
  frames: FrozenFrame[]
  changed: number
  /** Set when the card is freed: the pass drops the images it has not produced yet. */
  cancelled: boolean
}

interface TurnQueue {
  jobs: TurnJob[]
  /** Set when the document closes: an in-flight pass stops before its next image. */
  disposed: boolean
  /** Settles once the queue has nothing left to render. */
  drained: Promise<void> | null
}

const queues = new WeakMap<EditorStore, TurnQueue>()

/** Queued and running passes by message id, so a freed card cancels the work it owns. */
const activeJobs = new Map<string, TurnJob>()

onTurnRendersFreed((messageId) => {
  const job = activeJobs.get(messageId)
  if (job) job.cancelled = true
})

function summaryOf(frame: TurnFrame): TurnFrameSummary {
  return { frameId: frame.frameId, pageId: frame.pageId, name: frame.name }
}

/** Waits until no call of the document's reply is editing, and has not been for a moment. */
async function quiet(store: EditorStore): Promise<void> {
  for (;;) {
    await currentRun(store).settled()
    await promiseTimeout(TURN_RENDER_PAUSE_MS)
    if (!currentRun(store).editing) return
  }
}

function pngBlob(bytes: Uint8Array | null): Blob | null {
  return bytes ? new Blob([new Uint8Array(bytes)], { type: 'image/png' }) : null
}

async function renderNode(
  figma: FigmaAPI,
  graph: SceneGraph | null,
  pageId: string,
  node: SceneNode | undefined,
  frameId: string
): Promise<Blob | null> {
  if (!graph || !node) return null
  const scale = boundedImageScale(node.width, node.height, TURN_RENDER_MAX_EDGE)
  if (scale <= 0) return null
  const bytes = await figma.exportGraphImage?.(graph, pageId, [frameId], {
    scale,
    format: 'PNG'
  })
  return pngBlob(bytes ?? null)
}

/**
 * One frame's before and after at its own width, then the after at widths it reflows to. Null
 * once the card is freed, so no further image is drawn for it.
 */
async function renderFrame(
  store: EditorStore,
  frame: FrozenFrame,
  cancelled: () => boolean,
  widthBudget: { left: number }
): Promise<TurnFrameRenders | null> {
  const beforeNode = frame.before?.getNode(frame.frameId)
  const afterNode = frame.after?.getNode(frame.frameId)
  const figma = makeFigmaFromStore(store, frame.pageId)
  const before = await renderNode(figma, frame.before, frame.pageId, beforeNode, frame.frameId)
  await promiseTimeout(0)
  if (cancelled()) return null
  const after = await renderNode(figma, frame.after, frame.pageId, afterNode, frame.frameId)
  await promiseTimeout(0)
  if (cancelled()) return null
  const widths: TurnFrameWidth[] = []
  if (widthBudget.left > 0 && frame.after && afterNode && afterNode.layoutMode !== 'NONE') {
    for (const width of widthVariants(afterNode.width)) {
      if (widthBudget.left === 0) break
      const laid = layoutFrameAtWidth(frame.after, frame.pageId, frame.frameId, width)
      // A width the frame's own min or max held away is dropped, not mislabelled.
      if (!laid || laid.clamped) continue
      const blob = await renderNode(figma, laid.graph, laid.pageId, laid.frame, frame.frameId)
      await promiseTimeout(0)
      if (cancelled()) return null
      if (blob) {
        widths.push({ width, blob })
        widthBudget.left--
      }
    }
  }
  return {
    ...summaryOf(frame),
    before,
    after,
    widths,
    created: frame.before === null,
    deleted: frame.after === null
  }
}

/** Whether the document closed while the queue was waiting; read through a call, not narrowed. */
function closed(queue: TurnQueue): boolean {
  return queue.disposed
}

/** Whether the card was freed while its pass ran; also read through a call, not narrowed. */
function cancelled(job: TurnJob): boolean {
  return job.cancelled
}

async function drain(store: EditorStore, queue: TurnQueue): Promise<void> {
  try {
    while (queue.jobs.length > 0 && !closed(queue)) {
      await quiet(store)
      if (closed(queue)) return
      const job = queue.jobs.shift()
      if (!job) return
      if (cancelled(job)) {
        activeJobs.delete(job.messageId)
        continue
      }
      try {
        const frames: TurnFrameRenders[] = []
        const widthBudget = { left: MAX_WIDTH_RENDERS_PER_TURN }
        for (let index = 0; index < job.frames.length; index++) {
          if (cancelled(job)) break
          const frame = job.frames[index]
          const rendered = await renderFrame(store, frame, () => cancelled(job), widthBudget)
          if (!rendered) break
          frames.push(rendered)
          // This frame is done; let its before/after copies go before the next frame draws.
          job.frames[index] = { ...frame, before: null, after: null }
        }
        if (cancelled(job)) continue
        const expected = frames.some((frame) => !frame.deleted)
        const produced = frames.some((frame) => frame.after !== null)
        setTurnRenders(
          store,
          job.messageId,
          expected && !produced
            ? {
                status: 'unavailable',
                frames: job.frames.map(summaryOf),
                changed: job.changed
              }
            : { status: 'ready', frames, changed: job.changed }
        )
      } catch (error) {
        console.warn('Could not render the reply’s changed frames', error)
        if (!cancelled(job)) {
          setTurnRenders(store, job.messageId, {
            status: 'unavailable',
            frames: job.frames.map(summaryOf),
            changed: job.changed
          })
        }
      } finally {
        activeJobs.delete(job.messageId)
      }
    }
  } finally {
    queue.drained = null
  }
}

/**
 * Queues the turn's before and after renders once the reply settles. The after graphs are frozen
 * here, so edits made while the queue waits cannot leak into them. Nothing is awaited on the
 * reply path; a turn with no frames, or the setting off, is a no-op.
 */
export function queueTurnRenders(
  store: EditorStore,
  messageId: string,
  capture: TurnFrameCapture
): void {
  if (capture.frames.length === 0) return
  const summaries = capture.frames.map(summaryOf)
  setTurnRenders(store, messageId, {
    status: 'rendering',
    frames: summaries,
    changed: capture.changed
  })
  const frozen: FrozenFrame[] = capture.frames.map((frame) => {
    const node = store.graph.getNode(frame.frameId)
    return {
      ...frame,
      after: node
        ? extractExportGraph(store.graph, { scope: 'node', nodeId: frame.frameId }).graph
        : null
    }
  })
  let queue = queues.get(store)
  if (!queue) {
    const created: TurnQueue = { jobs: [], disposed: false, drained: null }
    queues.set(store, created)
    store.onDispose(() => {
      created.disposed = true
      created.jobs.length = 0
      freeTurnRendersOf(store)
    })
    queue = created
  }
  const job: TurnJob = { messageId, frames: frozen, changed: capture.changed, cancelled: false }
  queue.jobs.push(job)
  activeJobs.set(messageId, job)
  queue.drained ??= drain(store, queue)
}

/** Resolves once every turn render queued for the document has rendered or was dropped. */
export function turnRendersDrained(store: EditorStore): Promise<void> {
  return queues.get(store)?.drained ?? Promise.resolve()
}
