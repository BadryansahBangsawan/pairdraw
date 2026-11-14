import { shallowRef } from 'vue'

import { showDocumentChat } from '@/app/ai/chat/panel'
import type { EditorStore } from '@/app/editor/active-store'

import type { StyleKit } from './types'

/**
 * A style kit chosen outside a document's chat, such as in Goodies, waiting for that chat to pin
 * it to its open conversation. It belongs to its document, like a pending prompt, and is weak, so
 * a closed document's kit goes with it.
 */
const pending = new WeakMap<EditorStore, StyleKit>()
/** Bumped whenever `pending` changes, so the chat can watch without Vue tracking documents. */
const pendingVersion = shallowRef(0)

/** Leaves `kit` for the chat of `store`'s document, replacing one still waiting, and shows it. */
export function offerStyleKit(store: EditorStore, kit: StyleKit): void {
  pending.set(store, structuredClone(kit))
  pendingVersion.value++
  showDocumentChat(store)
}

/** Whether a kit waits for `store`'s chat. Reactive, so the chat can watch for one. */
export function hasPendingStyleKit(store: EditorStore): boolean {
  void pendingVersion.value
  return pending.has(store)
}

/** The kit waiting for `store`'s chat, which only the first caller receives. */
export function takePendingStyleKit(store: EditorStore): StyleKit | null {
  const kit = pending.get(store)
  if (!kit) return null
  pending.delete(store)
  pendingVersion.value++
  return kit
}
