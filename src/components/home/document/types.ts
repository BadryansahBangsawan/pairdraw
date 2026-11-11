/** What a document entry's menu can do; the list showing the entry offers the ones it supports. */
export type DocumentEntryAction = 'select' | 'deselect' | 'save-as' | 'remove-recent' | 'delete'

/** One item of a document entry's menu, with its translated label. */
type DocumentEntryMenuItem = { action: DocumentEntryAction; label: string }

/** A document entry's menu: the label of its ⋯ button and the items it offers. */
export type DocumentEntryMenu = { actions: string; items: readonly DocumentEntryMenuItem[] }
