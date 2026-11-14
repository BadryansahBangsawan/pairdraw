import { shallowRef } from 'vue'

import { resolveEditorProfile } from '@pairdraw/core'

import { chatColumnOpen } from '@/app/ai/chat/panel'
import { hasPendingPrompt } from '@/app/ai/chat/pending-prompt'
import { canvasPrompt } from '@/app/ai/chat/preferences'
import type { EditorStore } from '@/app/editor/active-store'
import { presenceOf } from '@/app/presence/registry'

/** Documents whose canvas prompt was closed; it does not come back to them. */
const closed = new WeakSet<EditorStore>()
/**
 * Bumped whenever `closed` changes, so callers that read it reactively stay in step without Vue
 * tracking the documents as object keys in its dependency table, which would keep a closed
 * document alive.
 */
const closedVersion = shallowRef(0)

/** The canvas prompt stays away from this document for as long as it is open. */
export function closeCanvasPrompt(store: EditorStore): void {
  closed.add(store)
  closedVersion.value++
}

/**
 * Whether `store`'s canvas offers a prompt that goes into the AI chat: an editable design, while
 * the chat column is closed, no agent works on it and no prompt waits for its chat. Boards keep
 * their canvas to themselves, since the chat's agent designs layouts. Reads reactive state, so a
 * computed value that calls it follows the chat column and the agents.
 */
export function offersCanvasPrompt(store: EditorStore): boolean {
  void closedVersion.value
  const { state } = store
  if (!canvasPrompt.value || chatColumnOpen.value) return false
  if (closed.has(store) || hasPendingPrompt(store)) return false
  if (state.documentKind !== 'design' || state.preparation) return false
  const profile = resolveEditorProfile(state)
  if (!profile.edits || !profile.editChrome) return false
  return presenceOf(store).agents.value.every((agent) => agent.status === 'idle')
}

/**
 * Whether the page `store` shows has nothing on it, which is when the canvas prompt suggests what
 * to ask for. Reads reactive state, like {@link offersCanvasPrompt}.
 */
export function isShownPageEmpty(store: EditorStore): boolean {
  void store.state.sceneVersion
  return store.graph.getNode(store.state.currentPageId)?.childIds.length === 0
}
