import { shallowRef } from 'vue'

import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * How a message written while the agent works reaches it, as in pi: `steer` goes in as soon as
 * the current tool calls finish, and `follow-up` waits until the agent has finished all work.
 * An agent that cannot take a message mid-turn gets either once its turn ends.
 */
export type QueuedMessageKind = 'steer' | 'follow-up'

export interface QueuedMessage {
  id: string
  kind: QueuedMessageKind
  submission: ChatSubmission
}

/**
 * Messages the person wrote while the agent was working, by document. Each tab mounts its own
 * chat, which goes when another tab shows, so what waits stays with its document: another
 * document's chat never shows or sends it, and its own takes it up again when it comes back.
 * Weak, so a closed document's messages go with it.
 */
const queues = new WeakMap<EditorStore, readonly QueuedMessage[]>()
/**
 * Bumped whenever a queue changes, so readers stay reactive without Vue tracking the documents
 * as object keys, which would keep a closed document alive (`pending-prompt.ts`).
 */
const version = shallowRef(0)

function setQueue(store: EditorStore, items: readonly QueuedMessage[]): void {
  if (items.length) queues.set(store, items)
  else queues.delete(store)
  version.value++
}

/** What waits in `store`'s chat, in the order it was written. Reactive. */
export function queuedMessages(store: EditorStore): readonly QueuedMessage[] {
  void version.value
  return queues.get(store) ?? []
}

/** Whether a message is waiting to go in mid-turn; the built-in chat ends its run for it. */
export function hasSteeringMessage(store: EditorStore): boolean {
  return queuedMessages(store).some((item) => item.kind === 'steer')
}

export function enqueueMessage(
  store: EditorStore,
  submission: ChatSubmission,
  kind: QueuedMessageKind
): void {
  setQueue(store, [...queuedMessages(store), { id: crypto.randomUUID(), kind, submission }])
}

/** The next message to send: steering first, then follow-ups, each in the order written. */
export function takeNextMessage(store: EditorStore): ChatSubmission | null {
  const items = queuedMessages(store)
  const next = items.find((item) => item.kind === 'steer') ?? items.at(0)
  if (!next) return null
  setQueue(
    store,
    items.filter((item) => item !== next)
  )
  return next.submission
}

/** Takes every queued message back, oldest first, so the person can edit them. */
export function takeBackMessages(store: EditorStore): ChatSubmission[] {
  const taken = queuedMessages(store).map((item) => item.submission)
  setQueue(store, [])
  return taken
}

export function removeQueuedMessage(store: EditorStore, id: string): void {
  const items = queuedMessages(store)
  const removed = items.find((item) => item.id === id)
  if (!removed) return
  setQueue(
    store,
    items.filter((item) => item !== removed)
  )
  for (const image of removed.submission.images) revokeImagePreviewURL(image.previewURL)
}

/** Drops the queue, as when the conversation changes underneath it. */
export function clearQueuedMessages(store: EditorStore): void {
  for (const item of queuedMessages(store)) removeQueuedMessage(store, item.id)
}
