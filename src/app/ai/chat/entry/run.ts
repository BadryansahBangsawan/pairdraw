import { resolveEditorProfile } from '@pairdraw/core'

import type { ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import { sendPromptToDocument } from '@/app/ai/chat/pending-prompt'
import { ensureChatConfigured } from '@/app/ai/chat/setup'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * Whether the AI chat can act on `store`'s document from outside the chat, such as from a sticky
 * note or a comment thread: the document is ready and open for edits, which is what the agent
 * makes. Reads reactive state, so menus that call it update as the document opens or locks.
 */
export function acceptsDocumentPrompts(store: EditorStore): boolean {
  const { state } = store
  return !state.preparation && resolveEditorProfile(state).edits
}

/**
 * Sends `text` from an entry point outside the chat into `store`'s document's chat, as Home and
 * the empty page's prompt do. Without a model, the chat looks for a coding agent on this computer
 * first and opens guided setup when it finds none; false when setup was dismissed and nothing went.
 */
export async function runPromptInDocument(
  store: EditorStore,
  text: string,
  options: { images?: ImageAttachmentDraft[] } = {}
): Promise<boolean> {
  const prompt = text.trim()
  if (!prompt || !(await ensureChatConfigured())) return false
  sendPromptToDocument(store, prompt, options)
  return true
}
