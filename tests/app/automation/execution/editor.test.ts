import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { acquireDocumentEdit, executeWithDocumentUndo } from '@/app/automation/execution/editor'
import { noteOutsideWrite } from '@/app/document/io/outside-writes'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'

let store: EditorStore

beforeEach(() => {
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
  store = createEditorStore(new SceneGraph())
})

afterEach(() => {
  store.dispose()
  Reflect.deleteProperty(globalThis, 'window')
})

test('undoing an automation edit that awaits returns the document to saved', async () => {
  const pageId = store.state.currentPageId
  store.markDocumentSaved()

  await executeWithDocumentUndo(store, pageId, 'Agent: eval', async () => {
    await Promise.resolve()
    store.graph.createNode('RECTANGLE', pageId, { width: 40, height: 20 })
    await Promise.resolve()
  })
  await Promise.resolve()
  expect(store.hasUnsavedChanges()).toBe(true)

  expect(store.undo.undo()).toBe('Agent: eval')
  await Promise.resolve()
  expect(store.graph.getChildren(pageId)).toEqual([])
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('an automation edit that throws part way leaves the document as it was, and saved', async () => {
  const pageId = store.state.currentPageId
  const card = store.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  store.markDocumentSaved()
  const before = store.snapshotPage(pageId)

  const edit = executeWithDocumentUndo(store, pageId, 'Agent: eval', async () => {
    store.graph.createNode('RECTANGLE', card.id, { width: 40, height: 20 })
    await Promise.resolve()
    store.graph.updateNode(card.id, { name: 'Renamed', x: 50 })
    throw new Error('script failed')
  })

  await expect(edit).rejects.toThrow('script failed')
  await Promise.resolve()
  expect(store.snapshotPage(pageId)).toEqual(before)
  expect(store.undo.canUndo).toBe(false)
  expect(store.undo.isRecording).toBe(false)
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('an automation edit that fails while the room wrote to the document keeps its step', async () => {
  const pageId = store.state.currentPageId
  const card = store.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  const peer = store.graph.createNode('FRAME', pageId, { name: 'Peer', width: 40, height: 40 })

  const edit = executeWithDocumentUndo(store, pageId, 'Agent: eval', async () => {
    store.graph.updateNode(card.id, { x: 50 })
    await Promise.resolve()
    // A collaborator's change arrives while the script waits.
    noteOutsideWrite(store)
    store.graph.updateNode(peer.id, { name: 'Renamed by peer' })
    throw new Error('script failed')
  })

  await expect(edit).rejects.toThrow('script failed')
  expect(store.graph.getNode(peer.id)?.name).toBe('Renamed by peer')
  expect(store.graph.getNode(card.id)?.x).toBe(50)
  expect(store.undo.undoLabel).toBe('Agent: eval')
})

test('an automation edit waits for an agent call already editing the document', async () => {
  const pageId = store.state.currentPageId
  const card = store.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  // An AI chat or MCP tool call holds the document's turn until the test lets it finish.
  const release = await acquireDocumentEdit(store)
  let ran = false

  const edit = executeWithDocumentUndo(store, pageId, 'Agent: eval', async () => {
    ran = true
    store.graph.updateNode(card.id, { x: 50 })
    throw new Error('script failed')
  })
  await Promise.resolve()
  store.graph.updateNode(card.id, { name: 'Written by the other call' })
  expect(ran).toBe(false)

  release()
  await expect(edit).rejects.toThrow('script failed')
  expect(ran).toBe(true)
  // The failed script rolls back only its own write, after the other call finished.
  expect(store.graph.getNode(card.id)?.x).toBe(0)
  expect(store.graph.getNode(card.id)?.name).toBe('Written by the other call')
})
