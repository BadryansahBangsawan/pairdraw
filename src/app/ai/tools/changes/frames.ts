import { extractExportGraph } from '@pairdraw/core/io'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { turnRenders } from '@/app/ai/chat/preferences'
import { currentRun, type Run } from '@/app/ai/reply/run'
import type { EditorStore } from '@/app/editor/active-store'

/** The frames one reply shows in the chat, each with the subtree it had before the turn. */
export interface TurnFrame {
  frameId: string
  pageId: string
  /** Frozen copy of the frame's subtree before the turn first touched it; null when new. */
  before: SceneGraph | null
  /** The frame's name at turn end. */
  name: string
}

/** What a finished turn left to render: the capped frames, and how many it touched. */
export interface TurnFrameCapture {
  frames: TurnFrame[]
  changed: number
}

/** A card shows at most this many frames; the rest are counted, not rendered. */
const MAX_TURN_FRAMES = 3

/** A frame this large is not copied or rendered for the chat; the main thread stays free. */
const MAX_FRAME_NODES = 1500

interface Capture {
  frames: Map<string, TurnFrame>
  /** Every top-level frame the turn touched, capped frames and skipped ones alike. */
  touched: Set<string>
}

const captures = new WeakMap<Run, Capture>()

function captureFor(run: Run): Capture {
  const existing = captures.get(run)
  if (existing) return existing
  const created: Capture = { frames: new Map(), touched: new Set() }
  captures.set(run, created)
  return created
}

function isTopLevelContainer(store: EditorStore, node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return false
  const parent = node.parentId ? store.graph.getNode(node.parentId) : undefined
  return parent?.type === 'CANVAS'
}

/** The number of nodes in a frame's subtree, counted without copying it. */
function subtreeSize(graph: SceneGraph, frameId: string): number {
  let total = 0
  const stack = [frameId]
  while (stack.length > 0) {
    const node = graph.getNode(stack.pop() ?? '')
    if (!node) continue
    total++
    stack.push(...node.childIds)
  }
  return total
}

/**
 * Notes a top-level frame a tool call changed, with the frame's subtree as it was before the
 * turn first touched it. Called while the document is as the call left it. The first few frames
 * are kept in the order the turn touched them; frames too large to render are skipped, and every
 * touched frame still counts so the card can say how many changed.
 */
export function noteTurnFrame(
  store: EditorStore,
  pageId: string,
  beforeGraph: SceneGraph,
  afterGraph: SceneGraph,
  frameId: string
): void {
  if (!turnRenders.value) return
  const run = currentRun(store)
  if (!run.active) return
  const node = store.graph.getNode(frameId)
  if (!node || !isTopLevelContainer(store, node)) return
  const capture = captureFor(run)
  if (capture.touched.has(frameId)) return
  capture.touched.add(frameId)
  if (capture.frames.size >= MAX_TURN_FRAMES) return
  const after = afterGraph.getNode(frameId)
  const before = beforeGraph.getNode(frameId)
  if (subtreeSize(after ? afterGraph : beforeGraph, frameId) > MAX_FRAME_NODES) return
  const copy = before ? extractExportGraph(beforeGraph, { scope: 'node', nodeId: frameId }) : null
  capture.frames.set(frameId, {
    frameId,
    pageId,
    before: copy?.graph ?? null,
    name: node.name
  })
}

/**
 * Takes the turn's frames once it ends, refreshing each name from the live document, and empties
 * the capture so its copies are held only until the render pass starts.
 */
export function takeTurnFrames(store: EditorStore, run: Run): TurnFrameCapture {
  const capture = captures.get(run)
  if (!capture) return { frames: [], changed: 0 }
  captures.delete(run)
  const frames = [...capture.frames.values()].map((frame) => ({
    ...frame,
    name: store.graph.getNode(frame.frameId)?.name ?? frame.name
  }))
  return { frames, changed: capture.touched.size }
}
