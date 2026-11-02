import { computed, shallowRef, watch } from 'vue'

/**
 * How a click picks documents on Home: `toggle` adds or drops one, as Cmd/Ctrl+click does, and
 * `range` selects every document from the last one toggled to this one, as Shift+click does.
 */
export type DocumentSelectMode = 'toggle' | 'range'

/** The documents picked on Home, and the one a range starts from. */
export interface DocumentSelection {
  readonly ids: ReadonlySet<string>
  readonly anchor: string | null
}

export const EMPTY_DOCUMENT_SELECTION: DocumentSelection = { ids: new Set(), anchor: null }

function toggled(selection: DocumentSelection, id: string): DocumentSelection {
  const ids = new Set(selection.ids)
  if (ids.has(id)) ids.delete(id)
  else ids.add(id)
  return { ids, anchor: id }
}

/**
 * The selection after a click on `id` among the documents listed in `ordered`. A range without
 * an anchor still listed starts at `id`, so it selects just that document.
 */
export function selectDocument(
  selection: DocumentSelection,
  ordered: readonly string[],
  id: string,
  mode: DocumentSelectMode
): DocumentSelection {
  if (mode === 'toggle') return toggled(selection, id)
  const end = ordered.indexOf(id)
  const start = selection.anchor === null ? -1 : ordered.indexOf(selection.anchor)
  if (end === -1 || start === -1) return toggled(EMPTY_DOCUMENT_SELECTION, id)
  const [from, to] = start <= end ? [start, end] : [end, start]
  return { ids: new Set(ordered.slice(from, to + 1)), anchor: selection.anchor }
}

/** The selection without documents that are no longer listed, such as removed or filtered ones. */
export function pruneDocumentSelection(
  selection: DocumentSelection,
  ordered: readonly string[]
): DocumentSelection {
  const listed = new Set(ordered)
  const ids = new Set([...selection.ids].filter((id) => listed.has(id)))
  if (ids.size === selection.ids.size && (!selection.anchor || listed.has(selection.anchor))) {
    return selection
  }
  return { ids, anchor: selection.anchor && listed.has(selection.anchor) ? selection.anchor : null }
}

/**
 * The documents picked in one Home list, which follows `ordered`: what the list shows, in the
 * order it shows them. Documents that leave the list leave the selection.
 */
export function useDocumentSelection(ordered: () => readonly string[]) {
  const selection = shallowRef<DocumentSelection>(EMPTY_DOCUMENT_SELECTION)
  watch(ordered, (ids) => {
    selection.value = pruneDocumentSelection(selection.value, ids)
  })
  const ids = computed(() => selection.value.ids)
  return {
    ids,
    count: computed(() => ids.value.size),
    /** The selected ids in the order the list shows them. */
    ordered: computed(() => ordered().filter((id) => ids.value.has(id))),
    has: (id: string) => ids.value.has(id),
    select(id: string, mode: DocumentSelectMode) {
      selection.value = selectDocument(selection.value, ordered(), id, mode)
    },
    selectAll() {
      const all = ordered()
      selection.value = { ids: new Set(all), anchor: all.at(0) ?? null }
    },
    clear() {
      selection.value = EMPTY_DOCUMENT_SELECTION
    }
  }
}

export type DocumentSelectionState = ReturnType<typeof useDocumentSelection>
