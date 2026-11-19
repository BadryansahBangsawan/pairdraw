import { afterEach, expect, test } from 'bun:test'

import { createDocumentGraph } from '@pairdraw/core'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { pastePoint } from '@/app/editor/clipboard/paste/content'
import { createEditorStore } from '@/app/editor/session/create'

import { setupGlobals } from '#tests/helpers/automation/globals'

setupGlobals()

const stores: ReturnType<typeof createEditorStore>[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

/** A window much wider than the canvas the editor reports. */
function canvasStore() {
  const store = createEditorStore(createDocumentGraph('design'))
  store.setViewportSize(844, 713)
  store.setViewportInsets({ top: 0, right: 0, bottom: 0, left: 60 })
  store.state.panX = 422
  store.state.panY = 356.5
  store.state.zoom = 1
  stores.push(store)
  return store
}

test('the viewport an agent reads is the middle of the canvas, not the window', () => {
  const store = canvasStore()
  const api = makeFigmaFromStore(store)

  const middle = store.viewportCanvasCenter()
  expect(api.viewport.center).toEqual({
    x: middle.x - store.state.panX,
    y: middle.y - store.state.panY
  })
  expect(api.viewport.center.x).not.toBeCloseTo(512 - 422)
})

test('a viewport centre an agent sets reads back, and lands on the canvas middle', () => {
  const store = canvasStore()
  const api = makeFigmaFromStore(store)

  api.viewport = { center: { x: 300, y: 250 }, zoom: 1 }

  expect(api.viewport.center).toEqual({ x: 300, y: 250 })
  const middle = store.viewportCanvasCenter()
  expect(store.screenToCanvas(middle.x, middle.y)).toEqual({ x: 300, y: 250 })
})

test('a paste without a cursor lands at the middle of the canvas', () => {
  const store = canvasStore()

  const middle = store.viewportCanvasCenter()
  expect(pastePoint(store)).toEqual({
    x: middle.x - store.state.panX,
    y: middle.y - store.state.panY
  })
})
