import { isEditing } from '@/app/shell/keyboard/focus'

/** What the keys of a Home list act on: its document selection. */
type DocumentListSelection = {
  readonly count: { readonly value: number }
  selectAll(): void
  clear(): void
}

/**
 * The keys of a Home list while focus is in it: Cmd/Ctrl+A selects every document it shows, and
 * Escape clears the selection, which it keeps from closing anything around the list.
 */
export function useDocumentListKeys(selection: DocumentListSelection) {
  return (event: KeyboardEvent) => {
    if (isEditing(event) || event.altKey) return
    if (event.code === 'KeyA' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
      event.preventDefault()
      selection.selectAll()
      return
    }
    if (event.key === 'Escape' && selection.count.value > 0) {
      event.preventDefault()
      event.stopPropagation()
      selection.clear()
    }
  }
}
