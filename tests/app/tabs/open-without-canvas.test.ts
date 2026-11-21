import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test, vi } from 'bun:test'

import { IORegistry, BUILTIN_IO_FORMATS } from '@pairdraw/core/io'
import * as layoutModule from '@pairdraw/core/layout'

import { createHomeTab, getTabsSnapshot, openFileInNewTab } from '@/app/tabs'

import { expectDefined } from '#tests/helpers/assert'
import { clearTabGlobals, setupTabGlobals } from '#tests/helpers/tabs/globals'

beforeEach(() => {
  setupTabGlobals()
  createHomeTab()
  // The open path finishes as the page is applied; its layout is not what this test measures.
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
})

afterEach(() => {
  clearTabGlobals()
  vi.restoreAllMocks()
})

async function headlessFig(): Promise<Uint8Array> {
  const { createEditor } = await import('@pairdraw/core/editor')
  const editor = createEditor()
  const page = editor.graph.getPages()[0].id
  editor.graph.createNode('FRAME', page, { name: 'Screen', width: 300, height: 200 })
  const written = await new IORegistry(BUILTIN_IO_FORMATS).writeDocument('fig', editor.graph)
  return written.data as Uint8Array
}

test('an open with no canvas finishes after the page is applied, without a first frame', async () => {
  const bytes = await headlessFig()
  const before = getTabsSnapshot().filter((tab) => tab.kind === 'document').length
  const started = performance.now()
  const store = await Promise.race([
    openFileInNewTab(
      new File([bytes.buffer as ArrayBuffer], 'headless.fig'),
      undefined,
      '/tmp/headless.fig'
    ),
    new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 1000)
    })
  ])

  expect(store).not.toBe('timeout')
  if (store === 'timeout') return
  expect(performance.now() - started).toBeLessThan(1000)
  const page = store.graph.getPages()[0]
  expect(
    store.graph.getChildren(expectDefined(page, 'page').id).map((node) => node.name)
  ).toContain('Screen')
  // The page is in; only the first frame is outstanding, and acknowledging it finishes the load.
  expect(store.state.preparation?.phase).toBe('preparing-render')
  store.preparationController.acknowledgePresentation(store.state.sceneVersion)
  await Bun.sleep(0)
  expect(store.state.preparation).toBeNull()
  expect(getTabsSnapshot().filter((tab) => tab.kind === 'document')).toHaveLength(before + 1)
})
