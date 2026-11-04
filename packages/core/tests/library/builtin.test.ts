import { describe, expect, test } from 'bun:test'

import {
  BUILTIN_LIBRARY_ID,
  buildBasicsLibrary,
  materializeLibraryAsset,
  MemoryLibraryCatalog,
  publishBasicsLibrary
} from '@open-pencil/core/library'
import { SceneGraph } from '@open-pencil/scene-graph'

describe('builtin basics library', () => {
  test('builds five original components', () => {
    const graph = new SceneGraph()
    const ids = buildBasicsLibrary(graph, graph.getPages()[0].id)
    const names = ids.map((id) => graph.getNode(id)?.name)
    expect(names).toEqual(['Button', 'Input', 'Badge', 'Card', 'Avatar'])
    expect(ids.every((id) => graph.getNode(id)?.type === 'COMPONENT')).toBe(true)
  })

  test('publishes and materializes every asset', async () => {
    const catalog = new MemoryLibraryCatalog()
    const revision = await publishBasicsLibrary(catalog)
    expect(revision.manifest.libraryId).toBe(BUILTIN_LIBRARY_ID)
    expect(revision.manifest.publishedAt).toBe('2026-11-04T00:00:00.000Z')
    const [summary] = await catalog.listLibraries()
    expect(summary?.assetCount).toBe(5)

    const consumer = new SceneGraph()
    for (const asset of revision.manifest.assets) {
      const materialized = materializeLibraryAsset(consumer, revision, asset.key)
      const component = consumer.getNode(materialized.componentId)
      expect(component?.type).toBe('COMPONENT')
    }

    expect([...consumer.getAllNodes()].filter((node) => node.type === 'COMPONENT')).toHaveLength(5)
  })
})
