import { showDocumentChat } from '@/app/ai/chat/panel'
import { exploreSetting } from '@/app/ai/explore/state'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * "Variations…" on a layer: selects it and turns "Let it cook" on with its count and axis as
 * they were, then shows the chat, so the next message asks for versions of that layer, which
 * land in its set of variations beside it.
 */
export function exploreVariationsOf(store: EditorStore, nodeId: string): void {
  store.select([nodeId])
  exploreSetting.value = { ...exploreSetting.value, mode: 'variants' }
  showDocumentChat(store)
}
