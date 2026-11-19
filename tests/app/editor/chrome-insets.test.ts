import { afterEach, expect, test } from 'bun:test'

import { createDocumentGraph } from '@pairdraw/core'

import { createEditorStore } from '@/app/editor/session/create'

const stores: ReturnType<typeof createEditorStore>[] = []

function documentStore() {
  const store = createEditorStore(createDocumentGraph('design'))
  store.setViewportSize(800, 600)
  stores.push(store)
  return store
}

afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

test('the editor fits into the canvas the floating chrome leaves', () => {
  const store = documentStore()
  store.graph.createNode('RECTANGLE', store.state.currentPageId, {
    x: 0,
    y: 0,
    width: 200,
    height: 100
  })
  store.setViewportInsets({ top: 0, right: 0, bottom: 0, left: 60 })

  store.zoomToFit()

  const { panX, panY, zoom } = store.state
  expect(panX + 0 * zoom).toBeGreaterThanOrEqual(60)
  expect(panY + 0 * zoom).toBeGreaterThanOrEqual(0)
})

test('the canvas is left whole until chrome is reported', () => {
  const store = documentStore()
  store.graph.createNode('RECTANGLE', store.state.currentPageId, {
    x: 0,
    y: 0,
    width: 200,
    height: 100
  })

  store.zoomToFit()

  const { panX, zoom } = store.state
  expect(panX + 100 * zoom).toBe(400)
})
