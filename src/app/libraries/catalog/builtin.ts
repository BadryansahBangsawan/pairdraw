import {
  BUILTIN_LIBRARY_ID,
  BUILTIN_LIBRARY_PUBLISHED_AT,
  deserializeLibraryRevision,
  isLibraryRevisionNotFoundError,
  MemoryLibraryCatalog,
  publishBasicsLibrary,
  serializeLibraryRevision,
  type ComponentLibraryRevision,
  type LibraryCatalog,
  type LibrarySummary,
  type PublishLibraryInput
} from '@pairdraw/core/library'

interface PromiseSlot<T> {
  current?: Promise<T>
}

/** Keeps one in-flight promise. A rejection is dropped so the next call tries again. */
export function cacheUntilRejection<T>(slot: PromiseSlot<T>, load: () => Promise<T>): Promise<T> {
  const current = slot.current
  if (current) return current
  const pending = load().catch((error: unknown) => {
    if (slot.current === pending) slot.current = undefined
    throw error
  })
  slot.current = pending
  return pending
}

const builtinRevisionSlot: PromiseSlot<ComponentLibraryRevision> = {}

function cachedBuiltinRevision(): Promise<ComponentLibraryRevision> {
  return cacheUntilRejection(builtinRevisionSlot, () =>
    publishBasicsLibrary(new MemoryLibraryCatalog(), BUILTIN_LIBRARY_PUBLISHED_AT)
  )
}

function cloneRevision(revision: ComponentLibraryRevision): ComponentLibraryRevision {
  return deserializeLibraryRevision(serializeLibraryRevision(revision))
}

/**
 * Serves Pairdraw Basics from memory when the wrapped catalog has no copy of it.
 * A catalog that already published that id keeps its own revision, including a later one.
 */
export class IncludingBuiltinCatalog implements LibraryCatalog {
  readonly #inner: LibraryCatalog

  constructor(inner: LibraryCatalog) {
    this.#inner = inner
  }

  async listLibraries(): Promise<LibrarySummary[]> {
    const libraries = await this.#inner.listLibraries()
    if (libraries.some((library) => library.libraryId === BUILTIN_LIBRARY_ID)) return libraries
    const revision = await cachedBuiltinRevision()
    return [
      {
        libraryId: BUILTIN_LIBRARY_ID,
        name: revision.manifest.name,
        latestRevisionId: revision.manifest.revisionId,
        publishedAt: revision.manifest.publishedAt,
        assetCount: revision.manifest.assets.length
      },
      ...libraries
    ]
  }

  async getRevision(libraryId: string, revisionId?: string): Promise<ComponentLibraryRevision> {
    try {
      return await this.#inner.getRevision(libraryId, revisionId)
    } catch (error) {
      if (libraryId !== BUILTIN_LIBRARY_ID || !isLibraryRevisionNotFoundError(error)) throw error
      const revision = await cachedBuiltinRevision()
      if (revisionId !== undefined && revisionId !== revision.manifest.revisionId) throw error
      return cloneRevision(revision)
    }
  }

  publishRevision(input: PublishLibraryInput): Promise<ComponentLibraryRevision> {
    return this.#inner.publishRevision(input)
  }
}
