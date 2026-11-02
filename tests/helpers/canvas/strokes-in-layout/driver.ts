import type { Page } from '@playwright/test'

import type * as StrokeScene from '#tests/helpers/canvas/strokes-in-layout/scene'

/** The view the scene is shown in: canvas points are scene points times the zoom plus the pan. */
const VIEW = { zoom: 1.5, pan: 60 }

/** Builds the strokes-in-layout scene with nothing selected, laid out, at a fixed view. */
export function strokesInLayoutDriver(page: () => Page) {
  return {
    build() {
      return page().evaluate(async (view) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('OpenPencil store not initialized')
        const fixtureURL = '/tests/helpers/canvas/strokes-in-layout/scene.ts'
        const scene: typeof StrokeScene = await import(fixtureURL)
        const rows = scene.createStrokesInLayoutScene(store.graph, store.state.currentPageId)
        for (const row of rows) store.runLayoutForNode(row)
        store.state.zoom = view.zoom
        store.state.panX = view.pan
        store.state.panY = view.pan
        store.clearSelection()
        store.requestRender()
      }, VIEW)
    }
  }
}
