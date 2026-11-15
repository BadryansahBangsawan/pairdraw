import { uniq } from 'es-toolkit/array'

import type { DocumentChange } from '@pairdraw/core'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { aiMessages } from '@pairdraw/vue/i18n'

import { animateAIEdits } from '@/app/ai/chat/preferences'
import { animationsEnabled } from '@/app/shell/motion'
import { toast } from '@/app/shell/ui'

/** What the edit motion needs from an editor, which an `EditorStore` has. */
export interface AIEditMotionStore {
  graph: Pick<SceneGraph, 'getNode'>
  state: { currentPageId: string }
  aiEnter: (nodeIds: string[]) => void
  aiMarkActive: (nodeIds: string[]) => void
  aiMarkDone: (nodeIds: string[]) => void
  aiFlashDone: (nodeIds: string[]) => void
  select: (ids: string[]) => void
  zoomToSelection: () => void
}

/** The reply a call belongs to, which keeps its work going while the reply runs. */
export interface AIEditReply {
  run: { active: boolean }
}

/** A run of edits ends this long after the last one when no reply is behind it. */
export const AI_EDIT_IDLE_MS = 2500
/** After a reply's last edit, how long before its run of edits ends once the reply has. */
export const AI_EDIT_REPLY_SETTLE_MS = 600
/** A summary this recent is folded into the next one, so a long task keeps one notice. */
export const AI_EDIT_SUMMARY_MERGE_MS = 20_000
/** More layers than this in one edit trace in only the first, parents first. */
const MAX_ENTRANCES = 150

interface Summary {
  toastId: number
  added: number
  changed: number
  nodeIds: string[]
  endedAt: number
}

interface EditSession {
  areas: Set<string>
  added: Set<string>
  changed: Set<string>
  reply: AIEditReply | null
  timer: ReturnType<typeof setTimeout> | null
}

const sessions = new WeakMap<AIEditMotionStore, EditSession>()
const summaries = new WeakMap<AIEditMotionStore, Summary>()

/** The page child holding `nodeId`, or null when it is not on `pageId`. */
function areaOf(graph: AIEditMotionStore['graph'], nodeId: string, pageId: string): string | null {
  let node = graph.getNode(nodeId)
  while (node?.parentId) {
    if (node.parentId === pageId) return node.id
    node = graph.getNode(node.parentId)
  }
  return null
}

function shown(graph: AIEditMotionStore['graph'], nodeId: string): boolean {
  const node = graph.getNode(nodeId)
  return node !== undefined && node.visible && !node.internalOnly
}

/** Whether edits are animated: Settings → AI asks for it and the app's motion allows it. */
export function aiEditsAnimate(): boolean {
  return animateAIEdits.value && animationsEnabled.value
}

/** Selects the layers of a summary that still exist and brings them into view. */
function showLayers(store: AIEditMotionStore, nodeIds: readonly string[]) {
  const present = nodeIds.filter((id) => store.graph.getNode(id) !== undefined)
  if (present.length === 0) return
  store.select(present)
  store.zoomToSelection()
}

/** The notice's text, naming only the counts that are not zero. */
function summaryMessage(
  messages: ReturnType<typeof aiMessages.get>,
  added: number,
  changed: number
): string {
  if (changed === 0) return messages.editSummaryAdded({ added })
  if (added === 0) return messages.editSummaryChanged({ changed })
  return messages.editSummary({ added, changed })
}

function summarize(store: AIEditMotionStore, session: EditSession, now: number) {
  if (session.added.size + session.changed.size === 0) return
  const previous = summaries.get(store)
  const merge = previous && now - previous.endedAt < AI_EDIT_SUMMARY_MERGE_MS
  if (previous && merge) toast.remove(previous.toastId)
  const added = session.added.size + (merge ? previous.added : 0)
  const changed = session.changed.size + (merge ? previous.changed : 0)
  const nodeIds = [...(merge ? previous.nodeIds : []), ...session.added, ...session.changed]
  const messages = aiMessages.get()
  const toastId = toast.info(summaryMessage(messages, added, changed), {
    label: messages.editSummaryShow,
    run: () => showLayers(store, nodeIds)
  })
  summaries.set(store, { toastId, added, changed, nodeIds, endedAt: now })
}

function finish(store: AIEditMotionStore, session: EditSession) {
  sessions.delete(store)
  store.aiMarkDone([...session.areas])
  summarize(store, session, Date.now())
}

function schedule(store: AIEditMotionStore, session: EditSession, delay: number) {
  if (session.timer) clearTimeout(session.timer)
  session.timer = setTimeout(() => {
    session.timer = null
    // The reply is still thinking between calls: its work is not over yet.
    if (session.reply?.run.active) schedule(store, session, AI_EDIT_REPLY_SETTLE_MS)
    else finish(store, session)
  }, delay)
}

/**
 * Shows one AI edit on the canvas. Layers it added trace in one after another, layers it
 * changed flash, and the frames it works in shimmer until its run of edits ends, which closes
 * with a flash over them and a notice of what changed. Without animation it draws nothing.
 */
export function showAIEdit(
  store: AIEditMotionStore,
  change: DocumentChange,
  reply: AIEditReply | null = null
): void {
  // A flash is motion too, so with motion off the edit simply appears.
  if (!aiEditsAnimate()) return
  const { graph } = store
  const pageId = store.state.currentPageId
  const added = change.created
    .map((node) => node.id)
    .filter((id) => shown(graph, id) && areaOf(graph, id, pageId) !== null)
  const addedIds = new Set(added)
  const changed = change.updated
    .map((update) => update.id)
    .filter((id) => !addedIds.has(id) && shown(graph, id) && areaOf(graph, id, pageId) !== null)
  if (added.length + changed.length === 0) return

  if (added.length > 0) store.aiEnter(added.slice(0, MAX_ENTRANCES))
  if (changed.length > 0) store.aiFlashDone(changed)

  const session = sessions.get(store) ?? {
    areas: new Set<string>(),
    added: new Set<string>(),
    changed: new Set<string>(),
    reply: null,
    timer: null
  }
  sessions.set(store, session)
  session.reply = reply
  for (const id of added) session.added.add(id)
  for (const id of changed) if (!session.added.has(id)) session.changed.add(id)
  const areas = uniq([...added, ...changed].map((id) => areaOf(graph, id, pageId)))
  const fresh = areas.filter((id): id is string => id !== null && !session.areas.has(id))
  for (const id of fresh) session.areas.add(id)
  if (fresh.length > 0) store.aiMarkActive(fresh)
  schedule(store, session, reply ? AI_EDIT_REPLY_SETTLE_MS : AI_EDIT_IDLE_MS)
}
