import { computed, shallowRef } from 'vue'

import type { Editor, TextHyperlinkState } from '@open-pencil/core'
import { isOpenableLinkURL, normalizeLinkURL } from '@open-pencil/core/text'
import type { HyperlinkTarget } from '@open-pencil/scene-graph'
import { isCanvasTextInput } from '@open-pencil/vue/canvas/text-edit'

import { openExternalLink } from '@/app/shell/ui'
import { IS_TAURI } from '@/constants'

/** The texts the link editor is open for, in the editor that holds them. */
interface TextLinkEdit {
  editor: Editor
  nodeIds: string[]
  /** The control that opened the editor, which takes focus back when it closes. */
  opener: HTMLElement | null
}

/** What the link editor shows for its texts: their shared link, none, or several. */
export type TextLinkValue = HyperlinkTarget | null | 'mixed'

const openEdit = shallowRef<TextLinkEdit | null>(null)

/** The link editor's texts while it is open; one canvas shows it, the active one of `editor`. */
export const textLinkEdit = computed(() => openEdit.value)

/**
 * Opens web and mail links the canvas follows outside the editor: in the system browser or mail
 * app on the desktop, in a new tab in the browser. The address is checked again here, since the
 * event is the boundary between the document and the system.
 */
export function bindHyperlinkOpening(editor: Editor) {
  return editor.onEditorEvent('hyperlink:open', openDocumentLink)
}

/**
 * Opens an address a document links to. The document may come from anyone, so in the browser the
 * new tab gets no `window.opener` handle back to the editor and no referrer, as the app's own
 * external anchors (`ExternalLink.vue`).
 */
function openDocumentLink(url: string) {
  if (!isOpenableLinkURL(url)) return
  if (IS_TAURI) void openExternalLink(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}

/** The texts a link change acts on: the text being edited, or else the selected texts. */
export function textLinkTargets(editor: Editor): string[] {
  const editing = editor.state.editingTextId
  if (editing) return [editing]
  return [...editor.state.selectedIds].filter((id) => editor.graph.getNode(id)?.type === 'TEXT')
}

/** The link the texts share, for the panel and the link editor; reactive to selection and edits. */
export function textLinkValue(editor: Editor, nodeIds: readonly string[]): TextLinkValue {
  void editor.state.sceneVersion
  void editor.state.textSelectionVersion
  const states = nodeIds
    .map((id) => editor.getTextHyperlink(id))
    .filter((state): state is TextHyperlinkState => state !== null)
  if (states.length === 0) return null
  const [first, ...rest] = states.map((state) => state.link)
  return rest.every((link) => sameLink(link, first)) ? first : 'mixed'
}

function sameLink(a: TextLinkValue, b: TextLinkValue): boolean {
  if (a === null || b === null || a === 'mixed' || b === 'mixed') return a === b
  return a.type === b.type && a.value === b.value
}

/** Opens the link editor for the editor's texts; `opener` takes focus back when it closes. */
export function openTextLinkEditor(editor: Editor, opener: HTMLElement | null = null) {
  const nodeIds = textLinkTargets(editor)
  openEdit.value = nodeIds.length > 0 ? { editor, nodeIds, opener } : null
}

/** Whether the link editor is open for texts of `editor`. */
export function isTextLinkEditorOpen(editor: Editor): boolean {
  return openEdit.value?.editor === editor
}

export function closeTextLinkEditor() {
  openEdit.value = null
}

/**
 * Where focus goes when the link editor closes: back to the control that opened it, else to the
 * text being edited so typing goes on, else to the canvas the canvas menu opened it from.
 */
export function textLinkFocusTarget(
  editor: Editor,
  opener: HTMLElement | null,
  canvas: HTMLElement | null
): HTMLElement | null {
  if (opener?.isConnected) return opener
  if (editor.state.editingTextId) {
    const input = [...document.querySelectorAll('textarea')].find(isCanvasTextInput)
    if (input) return input
  }
  return canvas
}

/**
 * Links the texts to the address typed, as one undo step. Returns false, changing nothing, when
 * the address is not a web or mail address; texts with no characters to link are left as they are.
 */
export function applyTextLink(editor: Editor, nodeIds: readonly string[], url: string): boolean {
  if (normalizeLinkURL(url) === null) return false
  if (nodeIds.length === 1) {
    editor.setTextHyperlink(nodeIds[0], url)
    return true
  }
  editor.undo.runBatch('Set link', () => {
    for (const id of nodeIds) editor.setTextHyperlink(id, url)
  })
  return true
}

export function removeTextLink(editor: Editor, nodeIds: readonly string[]) {
  if (nodeIds.length === 1) {
    editor.setTextHyperlink(nodeIds[0], null)
    return
  }
  editor.undo.runBatch('Remove link', () => {
    for (const id of nodeIds) editor.setTextHyperlink(id, null)
  })
}

/** Follows the texts' shared link, as a ⌘-click on it does. */
export function followTextLink(editor: Editor, nodeIds: readonly string[]) {
  const link = textLinkValue(editor, nodeIds)
  if (link && link !== 'mixed') void editor.followHyperlink(link)
}
