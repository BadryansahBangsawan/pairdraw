import { describe, expect, test } from 'bun:test'

import {
  BUILTIN_LIBRARY_ID,
  MemoryLibraryCatalog,
  publishBasicsLibrary
} from '@pairdraw/core/library'
import { SceneGraph } from '@pairdraw/scene-graph'

import { createEditorStore } from '@/app/editor/session'
import { cacheUntilRejection } from '@/app/libraries/catalog/builtin'
import { LibraryService } from '@/app/libraries/service'

import { expectDefined } from '#tests/helpers/assert'

const BUILTIN_PUBLISHED_AT = '2026-11-04T00:00:00.000Z'
const COMPONENT_NAMES = ['Avatar', 'Badge', 'Button', 'Card', 'Input']

describe('the built-in Pairdraw Basics library', () => {
  test('is listed, enabled, and inserted without a published catalog', async () => {
    const graph = new SceneGraph()
    const editor = createEditorStore(graph)
    const service = new LibraryService(new MemoryLibraryCatalog())

    const libraries = await service.listLibraries()
    expect(libraries.map((library) => library.libraryId)).toEqual([BUILTIN_LIBRARY_ID])
    expect(libraries[0]).toMatchObject({
      name: 'Pairdraw Basics',
      assetCount: 5,
      publishedAt: BUILTIN_PUBLISHED_AT
    })

    await service.enable(editor, BUILTIN_LIBRARY_ID)
    expect(service.enabledAssets.value.map((asset) => asset.asset.name).sort()).toEqual(
      COMPONENT_NAMES
    )

    const button = service.enabledAssets.value.find((asset) => asset.asset.name === 'Button')
    expect(button?.asset.key).toBe(`${BUILTIN_LIBRARY_ID}/button`)
    if (!button) return
    const inserted = await service.insertComponent({
      libraryId: BUILTIN_LIBRARY_ID,
      assetKey: button.asset.key
    })
    expect(graph.getNode(inserted.id)?.type).toBe('INSTANCE')
    expect(graph.getNode(inserted.componentId)?.name).toBe('Button')
    expect(graph.getNode(inserted.componentId)?.type).toBe('COMPONENT')

    const revisionId = expectDefined(
      editor.graph.enabledLibraries.get(BUILTIN_LIBRARY_ID)?.revisionId,
      'revision'
    )
    const restarted = new LibraryService(new MemoryLibraryCatalog())
    await restarted.refresh(editor)
    expect(restarted.enabledAssets.value.map((asset) => asset.revisionId)).toEqual(
      Array.from({ length: 5 }, () => revisionId)
    )
    expect(restarted.enabledAssets.value.map((asset) => asset.asset.name).sort()).toEqual(
      COMPONENT_NAMES
    )
  })

  test('keeps a catalog copy of Pairdraw Basics instead of adding a second one', async () => {
    const catalog = new MemoryLibraryCatalog()
    const published = await publishBasicsLibrary(catalog, '2020-01-01T00:00:00.000Z')
    const service = new LibraryService(catalog)

    const listed = await service.listLibraries()
    expect(listed.filter((library) => library.libraryId === BUILTIN_LIBRARY_ID)).toEqual([
      {
        libraryId: BUILTIN_LIBRARY_ID,
        name: 'Pairdraw Basics',
        latestRevisionId: published.manifest.revisionId,
        publishedAt: '2020-01-01T00:00:00.000Z',
        assetCount: 5
      }
    ])
  })

  test('does not substitute the built-in revision for an unknown revision id', async () => {
    const editor = createEditorStore(new SceneGraph())
    const service = new LibraryService(new MemoryLibraryCatalog())

    await expect(service.enable(editor, BUILTIN_LIBRARY_ID, 'missing-revision')).rejects.toThrow(
      'Library revision not found'
    )
  })

  test('retries a built-in revision after the cached publish fails', async () => {
    const slot: { current?: Promise<string> } = {}
    let attempts = 0
    const load = (): Promise<string> => {
      attempts += 1
      if (attempts === 1) return Promise.reject(new Error('publish failed'))
      return Promise.resolve('revision')
    }

    await expect(cacheUntilRejection(slot, load)).rejects.toThrow('publish failed')
    await expect(cacheUntilRejection(slot, load)).resolves.toBe('revision')
    expect(attempts).toBe(2)
    await expect(cacheUntilRejection(slot, load)).resolves.toBe('revision')
    expect(attempts).toBe(2)
  })
})
