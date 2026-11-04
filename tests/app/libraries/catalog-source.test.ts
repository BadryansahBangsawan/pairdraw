import { describe, expect, test } from 'bun:test'

import 'fake-indexeddb/auto'

import type { LibraryCatalog, LibrarySummary } from '@open-pencil/core/library'

import { restoreLibraryCatalogSource } from '@/app/libraries/catalog/active-storage'
import { LibraryService } from '@/app/libraries/service'

import { asDouble } from '#tests/helpers/doubles'

const stored: LibrarySummary = {
  libraryId: 'stored-kit',
  name: 'Stored kit',
  latestRevisionId: 'r1',
  publishedAt: '2026-10-01T00:00:00.000Z',
  assetCount: 2
}

function storageCatalog(): LibraryCatalog {
  return asDouble<LibraryCatalog>({ listLibraries: async () => [stored] })
}

describe('the stored library catalog source', () => {
  test('reads from storage at once when storage was chosen last', async () => {
    const service = new LibraryService()
    restoreLibraryCatalogSource(service, 'storage', storageCatalog)

    expect(service.catalogSource).toBe('storage')
    const libraries = await service.listLibraries()
    expect(libraries.map((library) => library.libraryId)).toEqual(['pairdraw-basics', 'stored-kit'])
    expect(libraries[1]).toEqual(stored)
    expect(libraries[0]).toMatchObject({
      name: 'Pairdraw Basics',
      assetCount: 5,
      publishedAt: '2026-11-04T00:00:00.000Z'
    })
  })

  test('keeps the local catalog when it was chosen, without opening storage', () => {
    const service = new LibraryService()
    let opened = false
    restoreLibraryCatalogSource(service, 'local', () => {
      opened = true
      return storageCatalog()
    })

    expect(opened).toBe(false)
    expect(service.catalogSource).toBe('local')
  })

  test('keeps the local catalog when storage is no longer set up', () => {
    const service = new LibraryService()
    restoreLibraryCatalogSource(service, 'storage', () => {
      throw new Error('Storage is not configured')
    })

    expect(service.catalogSource).toBe('local')
  })
})
