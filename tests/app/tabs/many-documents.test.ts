import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as figModule from '@pairdraw/core/io/formats/fig'
import * as layoutModule from '@pairdraw/core/layout'
import { SceneGraph } from '@pairdraw/scene-graph'

import { createHomeTab, getTabForStore, openFileInNewTab, tabCount } from '@/app/tabs'

import { clearTabGlobals, settleTabs, setupTabGlobals } from '#tests/helpers/tabs/globals'

const bytes = new Uint8Array([1])

/** Opens a file the way the desktop shell, CLI and MCP hand one to the running app. */
function keep(name: string) {
  return openFileInNewTab(new File([bytes], name), undefined, `/designs/${name}`)
}

beforeEach(() => {
  setupTabGlobals()
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  vi.spyOn(figModule, 'readFigFile').mockResolvedValue(new SceneGraph())
  createHomeTab()
})

afterEach(() => {
  vi.restoreAllMocks()
  clearTabGlobals()
})

describe('opening documents one after another', () => {
  test('a sixth document gets its own tab instead of closing one of the five', async () => {
    const base = tabCount()
    const opened = []
    for (const name of ['a.fig', 'b.fig', 'c.fig', 'd.fig', 'e.fig']) {
      opened.push(await settleTabs(keep(name)))
    }
    expect(tabCount()).toBe(base + 5)

    const sixth = await settleTabs(keep('f.fig'))

    expect(tabCount()).toBe(base + 6)
    expect(getTabForStore(sixth)).toBeDefined()
    for (const store of opened) expect(getTabForStore(store)).toBeDefined()
  })
})
