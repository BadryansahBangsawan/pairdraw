import { shallowReactive } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'

import { hasPendingPrompt } from '@/app/ai/chat/pending-prompt'
import { canvasPrompt } from '@/app/ai/chat/preferences'
import type { EditorStore } from '@/app/editor/active-store'
import { presenceOf } from '@/app/presence/registry'

/** Documents whose canvas prompt was closed or used; it does not come back to them. */
const closed = shallowReactive(new WeakSet<EditorStore>())

/** The canvas prompt stays away from this document for as long as it is open. */
export function closeCanvasPrompt(store: EditorStore): void {
  closed.add(store)
}

/**
 * Whether the page `store` shows offers to start the AI chat from a prompt over the canvas: an
 * editable design whose page has nothing on it, while no agent works on it and no prompt waits for
 * its chat. Boards keep their canvas to themselves, since the chat's agent designs layouts. Reads
 * reactive state, so a computed value that calls it hides the prompt once the first layer exists.
 */
export function offersCanvasPrompt(store: EditorStore): boolean {
  const { state } = store
  if (!canvasPrompt.value || closed.has(store) || hasPendingPrompt(store)) return false
  if (state.documentKind !== 'design' || state.preparation) return false
  const profile = resolveEditorProfile(state)
  if (!profile.edits || !profile.editChrome) return false
  void state.sceneVersion
  const page = store.graph.getNode(state.currentPageId)
  if (!page || page.childIds.length > 0) return false
  return presenceOf(store).agents.value.every((agent) => agent.status === 'idle')
}
