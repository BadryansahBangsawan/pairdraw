import { compact } from 'es-toolkit'

import { useFileMessages, useRecoveryMessages } from '@open-pencil/vue/i18n'

import type { DocumentEntryMenu } from './types'

/** What a Home list offers for one of its documents, besides selecting it. */
type DocumentEntryMenuOptions = {
  /** The document is selected, so the menu offers to deselect it. */
  selected: boolean
  saveAs?: boolean
  removeRecent?: boolean
  delete?: boolean
  /** Delete is Delete draft, as a draft lives only on this device. */
  deleteDraft?: boolean
}

/**
 * Builds a document entry's menu, in the order every Home list shows it: select or deselect, Save
 * As, Remove from Recents, then Delete.
 */
export function useDocumentEntryMenu() {
  const files = useFileMessages()
  const recovery = useRecoveryMessages()
  return (name: string, options: DocumentEntryMenuOptions): DocumentEntryMenu => ({
    actions: files.value.documentActions({ name }),
    items: compact([
      options.selected
        ? { action: 'deselect', label: files.value.deselectDocument }
        : { action: 'select', label: files.value.selectDocument },
      options.saveAs && { action: 'save-as', label: files.value.saveDocumentAs },
      options.removeRecent && { action: 'remove-recent', label: files.value.removeFromRecents },
      options.delete && {
        action: 'delete',
        label: options.deleteDraft ? recovery.value.deleteDraft : files.value.deleteDocument
      }
    ] as const)
  })
}
