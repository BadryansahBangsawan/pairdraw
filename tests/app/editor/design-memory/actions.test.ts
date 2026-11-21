import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'

import { createDesignMemory } from '@pairdraw/scene-graph/design-memory'

import {
  allowDesignMemoryValue,
  createDesignMemoryFromDocument,
  learnDesignMemory,
  toggleDesignExamples
} from '@/app/editor/design-memory/actions'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'

let store: EditorStore

afterEach(() => store.dispose())

describe('design memory actions', () => {
  test('learning from layers opens the proposals for them and writes nothing yet', () => {
    store = createEditorStore()
    const card = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Card' })
    learnDesignMemory(store, [card.id])
    expect(store.designMemory()).toBeNull()
    expect(store.state.designMemoryOpen).toBe(true)
    expect(store.state.designMemoryLearnFrom).toEqual([card.id])

    createDesignMemoryFromDocument(store)
    expect(store.state.designMemoryLearnFrom).toEqual(store.graph.getPages().map(({ id }) => id))
  })

  test('allowing a value is one undo step', () => {
    store = createEditorStore()
    store.setDesignMemory(createDesignMemory())
    allowDesignMemoryValue(store, 'colors', '#FF00AA')
    expect(store.designMemory()?.colors.values).toEqual(['#FF00AA'])
    expect(store.undo.undo()).toBe('Allow #FF00AA')
    expect(store.designMemory()?.colors.values).toEqual([])
  })

  test('pins layers as examples, and unpins them when they all are', () => {
    store = createEditorStore()
    const pageId = store.state.currentPageId
    const a = store.graph.createNode('FRAME', pageId, { name: 'A' })
    const b = store.graph.createNode('FRAME', pageId, { name: 'B' })
    store.setDesignMemory(createDesignMemory())
    toggleDesignExamples(store, [a.id])
    toggleDesignExamples(store, [a.id, b.id])
    expect(store.designMemory()?.examples).toEqual([{ nodeId: a.id }, { nodeId: b.id }])
    toggleDesignExamples(store, [a.id, b.id])
    expect(store.designMemory()?.examples).toEqual([])
  })
})
