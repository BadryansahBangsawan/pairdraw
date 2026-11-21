import { describe, expect, test } from 'bun:test'

import { MemoryLibraryCatalog } from '@pairdraw/core/library'
import { SceneGraph } from '@pairdraw/scene-graph'

import { createEditorStore } from '@/app/editor/session'
import { LibraryService } from '@/app/libraries/service'

function source(width: number) {
  const graph = new SceneGraph()
  graph.createNode('COMPONENT', graph.getPages()[0].id, {
    name: 'Button',
    componentKey: 'button',
    width,
    height: 32
  })
  return graph
}

async function setup() {
  const catalog = new MemoryLibraryCatalog()
  const first = await catalog.publishRevision({
    libraryId: 'acme',
    name: 'Acme UI',
    graph: source(80),
    publishedAt: '2026-01-01T00:00:00Z'
  })
  const second = await catalog.publishRevision({
    libraryId: 'acme',
    name: 'Acme UI',
    graph: source(120),
    previousRevisionId: first.manifest.revisionId,
    publishedAt: '2026-01-02T00:00:00Z'
  })
  const consumer = new SceneGraph()
  const editor = createEditorStore(consumer)
  const service = new LibraryService(catalog)
  editor.updateEnabledLibraries((bindings) =>
    bindings.set('acme', {
      libraryId: 'acme',
      revisionId: second.manifest.revisionId,
      enabled: true
    })
  )
  service.bindEditor(editor)
  return { consumer, editor, service, first, second }
}

describe('inserting a library component', () => {
  test('a pinned revision does not move the document to that revision', async () => {
    const { consumer, editor, service, first, second } = await setup()

    const inserted = await service.insertComponent({
      libraryId: 'acme',
      assetKey: 'button',
      revisionId: first.manifest.revisionId
    })

    expect(consumer.getNode(inserted.id)?.width).toBe(80)
    expect(consumer.enabledLibraries.get('acme')?.revisionId).toBe(second.manifest.revisionId)
    await service.listLibraries()
    await service.refresh(editor)
    expect(service.updates.value).toEqual([])
  })

  test('a pinned revision that fails to materialize does not move it either', async () => {
    const { consumer, editor, service, first, second } = await setup()

    await expect(
      service.insertComponent({
        libraryId: 'acme',
        assetKey: 'missing',
        revisionId: first.manifest.revisionId
      })
    ).rejects.toThrow('Library asset not found')

    expect(consumer.enabledLibraries.get('acme')?.revisionId).toBe(second.manifest.revisionId)
    await service.listLibraries()
    await service.refresh(editor)
    expect(service.updates.value).toEqual([])
  })
})
