import { compact } from 'es-toolkit'

import { useFileMessages } from '@open-pencil/vue/i18n'

import type { DocumentEntryMenu } from './types'

/** What a Home list offers for one of its documents, besides selecting it. */
export type DocumentEntryMenuOptions = {
  /** The document is selected, so the menu offers to deselect it. */
  selected: boolean
  saveAs?: boolean
  removeRecent?: boolean
  delete?: boolean
}

/**
 * Builds a document entry's menu, in the order every Home list shows it: select or deselect, Save
 * As, Remove from Recents, then Delete.
 */
export function useDocumentEntryMenu() {
  const files = useFileMessages()
  return (name: string, options: DocumentEntryMenuOptions): DocumentEntryMenu => ({
    actions: files.value.documentActions({ name }),
    items: compact([
      options.selected
        ? { action: 'deselect', label: files.value.deselectDocument }
        : { action: 'select', label: files.value.selectDocument },
      options.saveAs && { action: 'save-as', label: files.value.saveDocumentAs },
      options.removeRecent && { action: 'remove-recent', label: files.value.removeFromRecents },
      options.delete && { action: 'delete', label: files.value.deleteDocument }
    ] as const)
  })
}
