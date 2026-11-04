import { describe, expect, test } from 'bun:test'

import { shallowRef } from 'vue'

import { BUILTIN_LIBRARY_ID, type LibrarySummary } from '@open-pencil/core/library'

import type { EditorStore } from '@/app/editor/session'
import {
  matchingDesignSystems,
  orderedDesignSystems,
  startDesignWith,
  useHomeDesignSystems
} from '@/app/home/design-systems'
import type { LibraryService } from '@/app/libraries'

import { asDouble } from '#tests/helpers/doubles'

function library(name: string, publishedAt: string): LibrarySummary {
  return { libraryId: name.toLowerCase(), name, latestRevisionId: 'r1', publishedAt, assetCount: 3 }
}

const acme = library('Acme UI', '2026-05-01T00:00:00.000Z')
const base = library('Base kit', '2026-06-01T00:00:00.000Z')
const core = library('Core', '2026-05-01T00:00:00.000Z')
const builtin: LibrarySummary = {
  libraryId: BUILTIN_LIBRARY_ID,
  name: 'Pairdraw Basics',
  latestRevisionId: 'rb',
  publishedAt: '2026-11-04T00:00:00.000Z',
  assetCount: 5
}

describe('design systems on Home', () => {
  test('lists the newest first, then by name', () => {
    expect(orderedDesignSystems([core, acme, base], 'en')).toEqual([base, acme, core])
  })

  test('narrows to the names holding the search', () => {
    expect(matchingDesignSystems([acme, base, core], 'kit', 'en')).toEqual([base])
    expect(matchingDesignSystems([acme, base], '', 'en')).toEqual([acme, base])
  })

  test('reads the catalog, and reports a failed read without dropping what it had', async () => {
    const summaries = shallowRef<LibrarySummary[]>([])
    let fail = false
    const service = asDouble<LibraryService>({
      summaries,
      async listLibraries() {
        if (fail) throw new Error('offline')
        summaries.value = [acme]
        return summaries.value
      }
    })
    const designSystems = useHomeDesignSystems(service)
    expect(designSystems.loaded.value).toBe(false)

    await designSystems.refresh()
    expect(designSystems.libraries.value).toEqual([acme])
    expect(designSystems.loaded.value).toBe(true)
    expect(designSystems.error.value).toBeNull()

    fail = true
    await designSystems.refresh()
    expect(designSystems.error.value).toBe('offline')
    expect(designSystems.libraries.value).toEqual([acme])
    expect(designSystems.loading.value).toBe(false)
  })

  test('does not offer the built-in library the Assets panel owns', async () => {
    const summaries = shallowRef<LibrarySummary[]>([])
    const service = asDouble<LibraryService>({
      summaries,
      async listLibraries() {
        summaries.value = [builtin, acme]
        return summaries.value
      }
    })
    const designSystems = useHomeDesignSystems(service)
    await designSystems.refresh()
    expect(designSystems.libraries.value).toEqual([acme])
  })

  test('a new design starts with the picked library turned on', async () => {
    const enabled: [EditorStore, string][] = []
    const service = asDouble<LibraryService>({
      async enable(store: EditorStore, libraryId: string) {
        enabled.push([store, libraryId])
      }
    })
    const store = asDouble<EditorStore>({})
    await startDesignWith(store, acme, service)
    expect(enabled).toEqual([[store, acme.libraryId]])
  })
})
