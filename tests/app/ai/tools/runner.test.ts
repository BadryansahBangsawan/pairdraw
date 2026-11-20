import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

import { runEditorTool } from '@/app/ai/tools/runner'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'
import { createDeferred } from '@/app/runtime/deferred'

import { expectDefined } from '#tests/helpers/assert'

let store: EditorStore

beforeEach(() => {
  // The automation FigmaAPI reads the viewport size from the window.
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
  store = createEditorStore(new SceneGraph())
})

afterEach(() => {
  store.dispose()
  Reflect.deleteProperty(globalThis, 'window')
})

test('a call cancelled while it waits for its turn edits nothing', async () => {
  const createShape = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'create_shape'),
    'create_shape'
  )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  // A first edit holds the document's lock until the test lets it finish.
  const held = createDeferred<undefined>()
  const first = runEditorTool({
    store,
    figma,
    def: { ...createShape, execute: () => held.promise },
    args: {},
    source: 'WebMCP'
  })
  const cancel = new AbortController()
  const queued = runEditorTool({
    store,
    figma,
    def: createShape,
    args: { type: 'RECTANGLE', x: 0, y: 0, width: 40, height: 20 },
    source: 'WebMCP',
    signal: cancel.signal
  })
  cancel.abort()
  held.resolve(undefined)

  await first
  await expect(queued).rejects.toThrow()
  expect(store.graph.getChildren(pageId)).toEqual([])
  expect(store.undo.peekUndo()).toBeUndefined()
})

test('undoing an asynchronous tool call returns the document to saved', async () => {
  const tool = (name: string) =>
    expectDefined(
      ALL_TOOLS.find((candidate) => candidate.name === name),
      name
    )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  const ids = [0, 20, 40].map(
    (x) => store.graph.createNode('RECTANGLE', pageId, { x, y: x / 2, width: 100, height: 70 }).id
  )
  store.markDocumentSaved()

  await runEditorTool({ store, figma, def: tool('arrange'), args: { ids }, source: 'MCP' })
  await Promise.resolve()
  expect(store.hasUnsavedChanges()).toBe(true)

  store.undo.undo()
  await Promise.resolve()
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('a structural call that throws part way leaves the document as it was', async () => {
  const evalTool = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'eval'),
    'eval'
  )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  const card = store.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  store.markDocumentSaved()
  const before = store.snapshotPage(pageId)

  const call = runEditorTool({
    store,
    figma,
    def: evalTool,
    args: {
      code: `
        const card = figma.getNodeById(${JSON.stringify(card.id)})
        card.name = 'Renamed'
        card.appendChild(figma.createRectangle())
        figma.currentPage.appendChild(figma.createEllipse())
        throw new Error('script failed')
      `
    },
    source: 'MCP'
  })

  await expect(call).rejects.toThrow('script failed')
  await Promise.resolve()
  expect(store.snapshotPage(pageId)).toEqual(before)
  expect(store.undo.peekUndo()).toBeUndefined()
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('a batch edits a document larger than the atomic transaction limit', async () => {
  const batchUpdate = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'batch_update'),
    'batch_update'
  )
  const pageId = store.state.currentPageId
  // Past MAX_TRANSACTION_NODES (10_000): the atomic path refuses the whole document.
  for (let i = 0; i < 12_000; i++) {
    store.graph.createNode('RECTANGLE', pageId, { name: `Layer ${i}`, width: 10, height: 10 })
  }
  const target = store.graph.createNode('FRAME', pageId, {
    name: 'Card',
    width: 100,
    height: 60,
    layoutMode: 'VERTICAL'
  })
  const figma = makeFigmaFromStore(store, pageId)

  const result = (await runEditorTool({
    store,
    figma,
    def: batchUpdate,
    args: { operations: [{ id: target.id, props: { spacing: 8, opacity: 0.5 } }] },
    source: 'MCP'
  })) as { updated?: number; error?: string }

  expect(result.error).toBeUndefined()
  expect(result.updated).toBe(1)
  const edited = store.graph.getNode(target.id)
  expect(edited?.itemSpacing).toBe(8)
  expect(edited?.opacity).toBe(0.5)
})

test('a batch that throws part way through leaves the large document as it was', async () => {
  const batchUpdate = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'batch_update'),
    'batch_update'
  )
  const pageId = store.state.currentPageId
  for (let i = 0; i < 12_000; i++) {
    store.graph.createNode('RECTANGLE', pageId, { name: `Layer ${i}`, width: 10, height: 10 })
  }
  const frame = store.graph.createNode('FRAME', pageId, { name: 'Card', width: 100, height: 60 })
  // sizing_horizontal FILL on a rectangle whose parent is the page throws mid-apply: the first
  // op (name) has already applied when the second one fails, so the whole batch must roll back.
  const loose = store.graph.createNode('RECTANGLE', pageId, {
    name: 'Loose',
    width: 10,
    height: 10
  })
  const figma = makeFigmaFromStore(store, pageId)
  store.markDocumentSaved()
  const before = store.snapshotPage(pageId)
  const call = runEditorTool({
    store,
    figma,
    def: batchUpdate,
    args: {
      operations: [
        { id: frame.id, props: { name: 'Renamed' } },
        { id: loose.id, props: { sizing_horizontal: 'FILL' } }
      ]
    },
    source: 'MCP'
  })

  await expect(call).rejects.toThrow()
  await Promise.resolve()
  expect(store.snapshotPage(pageId)).toEqual(before)
  expect(store.undo.peekUndo()).toBeUndefined()
  expect(store.hasUnsavedChanges()).toBe(false)
})
