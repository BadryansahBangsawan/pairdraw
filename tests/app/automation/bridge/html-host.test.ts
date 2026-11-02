import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { getHTMLToolHost } from '@open-pencil/core/tools'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { styleHTMLInBrowser } from '@/app/code/html-styler'
import { loadTailwindStylesheet } from '@/app/document/export/html'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'

let stores: EditorStore[] = []

beforeEach(() => {
  // The automation FigmaAPI reads the viewport size from the window.
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
})

afterEach(() => {
  for (const store of stores) store.dispose()
  stores = []
  Reflect.deleteProperty(globalThis, 'window')
})

test('agent HTML tools style with the browser and read Tailwind from the app bundle', () => {
  const store = createEditorStore()
  stores.push(store)
  expect(getHTMLToolHost(store.graph)).toBeUndefined()

  makeFigmaFromStore(store)

  // Node's file system, Tailwind's fallback, is not there in a browser or the desktop webview.
  expect(getHTMLToolHost(store.graph)).toEqual({
    style: styleHTMLInBrowser,
    loadTailwindStylesheet
  })
})
