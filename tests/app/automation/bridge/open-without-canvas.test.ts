import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test, vi } from 'bun:test'

import { createEditor } from '@pairdraw/core/editor'
import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import * as layoutModule from '@pairdraw/core/layout'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import { createHomeTab, getActiveStore, getTabsSnapshot } from '@/app/tabs'

import { expectDefined } from '#tests/helpers/assert'
import { clearTabGlobals, setupTabGlobals } from '#tests/helpers/tabs/globals'

const { handleRequest } = createAutomationCommandHandlers(makeFigmaFromStore)

beforeEach(() => {
  setupTabGlobals()
  createHomeTab()
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
})

afterEach(() => {
  clearTabGlobals()
  vi.restoreAllMocks()
})

/** A `.fig` a headless writer made, with one named frame on its page. */
async function headlessFig(): Promise<Uint8Array> {
  const editor = createEditor()
  const page = editor.graph.getPages()[0].id
  editor.graph.createNode('FRAME', page, { name: 'Applied' })
  return (await new IORegistry(BUILTIN_IO_FORMATS).writeDocument('fig', editor.graph))
    .data as Uint8Array
}

test('open_file answers once the page is applied, without waiting for a frame', async () => {
  const bytes = await headlessFig()
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(bytes.buffer as ArrayBuffer))
  const response = await Promise.race([
    handleRequest(getActiveStore(), 'open_file', { path: '/root/applied.fig' }) as Promise<{
      ok: boolean
      target?: { documentId: string; pageId: string }
    }>,
    new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 1000)
    })
  ])

  expect(response).not.toBe('timeout')
  if (response === 'timeout') return
  expect(response.ok).toBe(true)
  const pageId = response.target?.pageId
  const page = expectDefined(pageId, 'opened page id')
  const tab = expectDefined(
    getTabsSnapshot().find((candidate) => candidate.store.state.documentName === 'applied'),
    'opened tab'
  )
  expect(tab.store.graph.getChildren(page).map((node) => node.name)).toContain('Applied')
  // The page is applied; the first frame (or its failure) still ends the preparation.
  expect(tab.store.state.preparation?.phase).toBe('preparing-render')
  tab.store.preparationController.acknowledgePresentation(tab.store.state.sceneVersion)
  await Bun.sleep(0)
  expect(tab.store.state.preparation).toBeNull()
})
