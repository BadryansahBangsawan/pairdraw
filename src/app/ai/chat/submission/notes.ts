import type { UIMessage } from 'ai'

import {
  appendExploreContext,
  appendLayerNotesContext,
  exploreContextOf,
  resolveReferencedNodes,
  type ReferencedNode
} from '@/app/ai/chat/context'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import { exploreNote } from '@/app/ai/explore/note'
import type { ExploreRequest } from '@/app/ai/explore/request'
import { collectLayerNotes } from '@/app/ai/notes/collect'
import type { EditorStore } from '@/app/editor/active-store'

/** What a request says about the canvas beyond its text. */
export interface CanvasNoteSource {
  /** The request's text for the model, which the notes follow. */
  modelText: string
  /** The layers the message names. */
  nodes: readonly ReferencedNode[]
  /** How "Let it cook" asked for the request to be explored, if it was. */
  explore?: ExploreRequest
}

/** The text a message was sent with, notes for the model included. */
export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/**
 * Adds the canvas notes a request carries, read as it is sent: how to explore it, and the notes
 * left on the layers it concerns, which are the ones it names and the selection, or the whole
 * page when there are none. A layer's notes the conversation `earlier` already told the model,
 * unchanged, are not repeated.
 */
export function appendCanvasNotes(
  editor: EditorStore,
  source: CanvasNoteSource,
  earlier: readonly UIMessage[] = []
): string {
  const { graph, state } = editor
  const pageId = state.currentPageId
  const selected = resolveReferencedNodes(graph, [...state.selectedIds])
  const focus = [...source.nodes, ...selected]
  const explore = source.explore
    ? exploreNote(graph, pageId, source.explore, focus.at(0) ?? null)
    : null
  const notes = collectLayerNotes(
    graph,
    pageId,
    focus.map((node) => node.id)
  )
  const told = earlier.filter((message) => message.role === 'user').map(messageText)
  return appendLayerNotesContext(appendExploreContext(source.modelText, explore), notes, told)
}

/**
 * An edited message's text with its canvas notes: notes on layers are read again for the new
 * text, and how the message was asked to be explored stays as it was sent.
 */
export function appendEditedCanvasNotes(
  editor: EditorStore,
  text: string,
  edited: UIMessage,
  earlier: readonly UIMessage[] = []
): string {
  const modelText = `${text}${exploreContextOf(messageText(edited))}`
  return appendCanvasNotes(
    editor,
    { modelText, nodes: mentionedNodes(editor.graph, text) },
    earlier
  )
}
