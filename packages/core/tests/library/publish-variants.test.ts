import { describe, expect, test } from 'bun:test'

import { createLibraryRevision, ensureLibraryAssetKeys, extractLibrarySnapshot } from '@pairdraw/core/library'
import { SceneGraph } from '@pairdraw/scene-graph'

describe('publishing a component that instances a variant', () => {
  test('resolves the variant through its set, as a Figma library does', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const set = graph.createNode('COMPONENT_SET', page.id, { name: 'Badge' })
    graph.createNode('COMPONENT', set.id, {
      name: 'Variant=default',
      componentPropertyValues: { Variant: 'default' }
    })
    const outline = graph.createNode('COMPONENT', set.id, {
      name: 'Variant=outline',
      componentPropertyValues: { Variant: 'outline' }
    })
    const host = graph.createNode('COMPONENT', page.id, { name: 'Card' })
    const instance = graph.createInstance(outline.id, host.id)
    if (!instance) throw new Error('Expected the variant instance')

    ensureLibraryAssetKeys(graph)

    expect(graph.getNode(set.id)?.componentKey).toBe('badge')
    expect(graph.getNode(outline.id)?.componentKey).toBeNull()

    const snapshot = extractLibrarySnapshot(graph)
    expect(snapshot.assetRoots.map((node) => node.componentKey)).toEqual(['badge', 'card'])

    const revision = await createLibraryRevision({
      libraryId: 'design-system',
      name: 'DS',
      graph
    })

    expect(revision.manifest.assets.map((asset) => asset.key)).toEqual(['badge', 'card'])
  })
})
