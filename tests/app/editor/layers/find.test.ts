import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { createDocumentGraph } from '@open-pencil/core'

import { findableLayers, goToLayer, openFindLayers } from '@/app/editor/layers/find'
import { createEditorStore } from '@/app/editor/session/create'

const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

function document() {
  const store = createEditorStore(createDocumentGraph('design'))
  stores.push(store)
  return store
}

test('lists the shown page front layer first, each parent before its children', () => {
  const store = document()
  const page = store.state.currentPageId
  const card = store.graph.createNode('FRAME', page, { name: 'Card' })
  store.graph.createNode('TEXT', card.id, { name: 'Title' })
  const row = store.graph.createNode('FRAME', card.id, { name: 'Row' })
  store.graph.createNode('RECTANGLE', row.id, { name: 'Badge' })
  store.graph.createNode('RECTANGLE', page, { name: 'Backdrop' })
  store.graph.createNode('RECTANGLE', store.graph.addPage('Other').id, { name: 'Elsewhere' })

  expect(
    findableLayers(store).map(({ node, ancestors }) => [...ancestors, node.name].join(' / '))
  ).toEqual(['Backdrop', 'Card', 'Card / Row', 'Card / Row / Badge', 'Card / Title'])
})

test('stops at its limit on a page with more layers', () => {
  const store = document()
  for (let index = 0; index < 5; index++) {
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: `Layer ${index}` })
  }
  expect(findableLayers(store, 3)).toHaveLength(3)
})

test('going to a layer selects it, and a layer that is gone is left alone', () => {
  const store = document()
  const card = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Card' })
  const title = store.graph.createNode('TEXT', card.id, { name: 'Title' })

  openFindLayers(store)
  expect(store.state.findLayersOpen).toBe(true)
  goToLayer(store, title.id)
  expect([...store.state.selectedIds]).toEqual([title.id])

  goToLayer(store, 'missing')
  expect([...store.state.selectedIds]).toEqual([title.id])
})
