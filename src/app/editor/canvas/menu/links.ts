import { resolveEditorProfile, type Editor } from '@open-pencil/core'
import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

import {
  followTextLink,
  openTextLinkEditor,
  removeTextLink,
  textLinkTargets,
  textLinkValue
} from '@/app/editor/links'

export type TextLinkMenuLabels = {
  addTextLink: string
  editTextLink: string
  openTextLink: string
  removeTextLink: string
}

/**
 * The canvas menu's entries for the selected texts' link: add or edit it in the link editor, and
 * open or remove a link they have. A read-only document only opens links. Reactive to the
 * selection, the characters being edited, and the document.
 */
export function textLinkMenuEntries(editor: Editor, labels: TextLinkMenuLabels): MenuEntry[] {
  const nodeIds = textLinkTargets(editor)
  if (nodeIds.length === 0) return []
  const link = textLinkValue(editor, nodeIds)
  const edits = resolveEditorProfile(editor.state).edits
  const entries: MenuEntry[] = []
  if (edits) {
    entries.push({
      label: link ? labels.editTextLink : labels.addTextLink,
      action: () => openTextLinkEditor(editor)
    })
  }
  if (link) {
    entries.push({
      label: labels.openTextLink,
      disabled: link === 'mixed',
      action: () => followTextLink(editor, nodeIds)
    })
    if (edits) {
      entries.push({ label: labels.removeTextLink, action: () => removeTextLink(editor, nodeIds) })
    }
  }
  return entries.length > 0 ? [{ separator: true }, ...entries] : []
}
