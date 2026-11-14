import { shallowRef } from 'vue'

import type { ReferencedNode } from '@/app/ai/chat/context'
import { showDocumentChat } from '@/app/ai/chat/panel'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * A prompt written outside a document's chat, on Home or over an empty canvas, waiting for that
 * document's chat to send it. Unlike the queue of messages written while the agent works, it
 * belongs to its document rather than to whichever tab shows, so switching tabs never drops or
 * misdirects it; it waits until its own document's chat is ready. Weak, so a closed document's
 * prompt goes with it.
 */
const pending = new WeakMap<EditorStore, ChatSubmission>()
/**
 * Bumped whenever `pending` changes, so callers that read it reactively stay in step without
 * Vue tracking the documents as object keys in its dependency table, which would keep a closed
 * document alive.
 */
const pendingVersion = shallowRef(0)

/** A text prompt as the chat sends what the composer submits, with the layers it mentions. */
export function promptSubmission(text: string, nodes: ReferencedNode[] = []): ChatSubmission {
  return { modelText: text, displayText: text, images: [], nodes }
}

/** Leaves `submission` for the chat of `store`'s document, replacing one still waiting there. */
export function setPendingPrompt(store: EditorStore, submission: ChatSubmission): void {
  pending.set(store, submission)
  pendingVersion.value++
}

/** Whether a prompt waits for `store`'s chat. Reactive, so the chat can watch for one. */
export function hasPendingPrompt(store: EditorStore): boolean {
  void pendingVersion.value
  return pending.has(store)
}

/** The prompt waiting for `store`'s chat, which only the first caller receives. */
export function takePendingPrompt(store: EditorStore): ChatSubmission | null {
  const submission = pending.get(store)
  if (!submission) return null
  pending.delete(store)
  pendingVersion.value++
  return submission
}

/**
 * Sends `text` from outside the chat to `store`'s document's chat, and shows that chat. Layers it
 * references (`[Hero](pairdraw://node/1:2)`) go with it as previews, as from the composer.
 */
export function sendPromptToDocument(store: EditorStore, text: string): void {
  setPendingPrompt(store, promptSubmission(text, mentionedNodes(store.graph, text)))
  showDocumentChat(store)
}
