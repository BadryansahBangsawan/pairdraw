import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { stickySublayers } from '@open-pencil/scene-graph/generated'
import { aiMessages } from '@open-pencil/vue/i18n'

import { referenceLink } from '@/app/ai/chat/references/link'

type StickyPromptMessages = Pick<ReturnType<typeof aiMessages.get>, 'stickyPromptSource'>

export interface StickyNoteText {
  note: SceneNode
  text: string
}

/**
 * The text of each selected sticky note, in selection order, when the selection is sticky notes
 * only; empty for any other selection. Notes with no text are left out.
 */
export function selectedStickyNotes(
  graph: SceneGraph,
  nodeIds: readonly string[]
): StickyNoteText[] {
  const notes: StickyNoteText[] = []
  for (const id of nodeIds) {
    const note = graph.getNode(id)
    if (note?.type !== 'STICKY') return []
    const text = stickySublayers(graph, note)?.body.text.trim() ?? ''
    if (text) notes.push({ note, text })
  }
  return notes
}

/**
 * The prompt the selected sticky notes make: each note's text, followed by a reference to the
 * note, so the chat shows where it came from and the agent can find it on the canvas. Null when
 * the selection holds no sticky note with text.
 */
export function stickyPrompt(
  graph: SceneGraph,
  nodeIds: readonly string[],
  messages: StickyPromptMessages = aiMessages.get()
): string | null {
  const notes = selectedStickyNotes(graph, nodeIds)
  if (notes.length === 0) return null
  return notes
    .map(({ note, text }) => {
      const link = referenceLink({ kind: 'node', id: note.id, label: note.name || text })
      return `${text}\n\n${messages.stickyPromptSource({ note: link })}`
    })
    .join('\n\n')
}
