import { computed, ref } from 'vue'

import type { LibrarySummary } from '@open-pencil/core/library'

import type { EditorStore } from '@/app/editor/session'
import { useLibraryService, type LibraryService } from '@/app/libraries'

/** The design systems whose name holds `query`, already lowercased in `locale`. */
export function matchingDesignSystems(
  libraries: readonly LibrarySummary[],
  query: string,
  locale: string
): readonly LibrarySummary[] {
  if (!query) return libraries
  return libraries.filter((library) => library.name.toLocaleLowerCase(locale).includes(query))
}

/** The design systems newest first, then by name. */
export function orderedDesignSystems(
  libraries: readonly LibrarySummary[],
  locale: string
): LibrarySummary[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
  return libraries.toSorted(
    (left, right) =>
      (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0) ||
      collator.compare(left.name, right.name)
  )
}

/**
 * Turns `library` on in `store`, a document just created for it, so its components are in the
 * Assets panel from the start.
 */
export function startDesignWith(
  store: EditorStore,
  library: LibrarySummary,
  service: LibraryService = useLibraryService()
): Promise<void> {
  return service.enable(store, library.libraryId)
}

/**
 * The design systems Home offers: the component libraries of the catalog the editor uses, which
 * keeps the ones published on this device or those read from storage.
 */
export function useHomeDesignSystems(service: LibraryService = useLibraryService()) {
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let request = 0

  async function refresh(): Promise<void> {
    const current = ++request
    loading.value = true
    try {
      await service.listLibraries()
      if (current === request) error.value = null
    } catch (cause) {
      if (current === request) error.value = cause instanceof Error ? cause.message : String(cause)
    } finally {
      if (current === request) {
        loading.value = false
        loaded.value = true
      }
    }
  }

  return {
    libraries: computed(() => service.summaries.value),
    loading,
    /** Whether a read finished, so an empty list means there are none rather than not yet read. */
    loaded,
    error,
    refresh
  }
}
