import { describe, expect, test } from 'bun:test'

import {
  createLibraryRevision,
  LibraryRevisionIntegrityError,
  materializeLibraryAsset,
  MemoryLibraryCatalog,
  type ComponentLibraryRevision
} from '@open-pencil/core/library'
import { SceneGraph } from '@open-pencil/scene-graph'

import { createEditorStore } from '@/app/editor/session'
import { LibraryService } from '@/app/libraries/service'

function source(names: string[]) {
  const graph = new SceneGraph()
  for (const name of names) {
    graph.createNode('COMPONENT', graph.getPages()[0].id, {
      name,
      componentKey: name.toLowerCase()
    })
  }
  return graph
}

/** A catalog whose copy of one library fails its integrity check, such as a tampered upload. */
class CorruptLibraryCatalog extends MemoryLibraryCatalog {
  override async getRevision(
    libraryId: string,
    revisionId?: string
  ): Promise<ComponentLibraryRevision> {
    if (libraryId === 'gone') throw new LibraryRevisionIntegrityError('Library asset hash mismatch')
    return super.getRevision(libraryId, revisionId)
  }
}

async function setup(catalog = new MemoryLibraryCatalog()) {
  // The document copied Button and Card from a library no catalog on this device has.
  const gone = await createLibraryRevision({
    libraryId: 'gone',
    name: 'Gone',
    graph: source(['Button', 'Card']),
    publishedAt: '2026-01-01T00:00:00Z'
  })
  await catalog.publishRevision({
    libraryId: 'replacement',
    name: 'Replacement',
    graph: source(['Button']),
    publishedAt: '2026-01-02T00:00:00Z'
  })
  const consumer = new SceneGraph()
  const button = materializeLibraryAsset(consumer, gone, 'button')
  const card = materializeLibraryAsset(consumer, gone, 'card')
  const page = consumer.getPages()[0]
  const buttonInstance = consumer.createNode('INSTANCE', page.id, {
    componentId: button.componentId
  })
  const cardInstance = consumer.createNode('INSTANCE', page.id, {
    componentId: card.componentId
  })
  const editor = createEditorStore(consumer)
  const service = new LibraryService(catalog)
  return { consumer, editor, service, button, card, buttonInstance, cardInstance }
}

describe('relinking a missing library', () => {
  test('refresh reports an enabled library the catalog cannot read instead of failing', async () => {
    const { editor, service } = await setup()

    await service.refresh(editor)

    expect(service.missing.value).toEqual([{ libraryId: 'gone', assetCount: 2, instanceCount: 2 }])
    expect(service.enabledAssets.value).toEqual([])
  })

  test('moves matched instances to the chosen library in one undoable step', async () => {
    const { consumer, editor, service, button, card, buttonInstance, cardInstance } = await setup()
    await service.refresh(editor)

    const result = await service.relink(editor, 'gone', 'replacement')

    expect(result).toEqual({ relinkedInstanceCount: 1, unmatched: ['Card'] })
    const relinked = consumer.getNode(consumer.getNode(buttonInstance.id)?.componentId ?? '')
    expect(relinked?.librarySource?.identity.libraryId).toBe('replacement')
    expect(consumer.getNode(cardInstance.id)?.componentId).toBe(card.componentId)
    expect(consumer.enabledLibraries.has('gone')).toBe(false)
    expect(consumer.enabledLibraries.get('replacement')?.enabled).toBe(true)
    expect(service.missing.value).toEqual([])

    editor.undo.undo()

    expect(consumer.getNode(buttonInstance.id)?.componentId).toBe(button.componentId)
    expect(consumer.enabledLibraries.get('gone')?.enabled).toBe(true)
    expect(consumer.enabledLibraries.has('replacement')).toBe(false)
    expect(
      [...consumer.getAllNodes()].some(
        (node) => node.librarySource?.identity.libraryId === 'replacement'
      )
    ).toBe(false)
  })

  test('a revision that fails its integrity check is reported, not treated as missing', async () => {
    const { editor, service } = await setup(new CorruptLibraryCatalog())

    await expect(service.refresh(editor)).rejects.toThrow(LibraryRevisionIntegrityError)
    expect(service.missing.value).toEqual([])
  })
})
