import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

/** A plugin that asks for one write and adds a rectangle where the plugin run puts it. */
const PLUGIN_SOURCE = `
  await plugin.call('create_shape', {
    type: 'RECTANGLE',
    x: 40,
    y: 40,
    width: 80,
    height: 60,
    name: 'From a plugin'
  })
  return 'done'
`

function pluginCatalog(command: string, enabled: boolean): string {
  return JSON.stringify({
    version: 1,
    plugins: [
      {
        id: 'e2e.marks',
        name: 'Marks',
        version: '1.0.0',
        command,
        capabilities: ['document:write'],
        grants: ['document:write'],
        asked: true,
        enabled,
        source: PLUGIN_SOURCE
      }
    ]
  })
}

/** Layer names in the active page, as the canvas graph holds them. */
function layerNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const page = store.graph.getNode(store.state.currentPageId)
    if (!page) return []
    return page.childIds.map((id) => store.graph.getNode(id)?.name ?? 'MISSING')
  })
}

function paletteShortcut() {
  return process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK'
}

test.describe('an enabled plugin', () => {
  test.use({
    storageState: async ({ baseURL }, use) => {
      if (!baseURL) throw new Error('Browser test baseURL is required')
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [
              { name: 'open-pencil:plugins', value: pluginCatalog('Leave a mark', true) }
            ]
          }
        ]
      })
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/?test')
    await new CanvasHelper(page).waitForInit()
  })

  test('offers its command in the palette and draws what it asks for', async ({ page }) => {
    await page.keyboard.press(paletteShortcut())
    const palette = page.getByRole('dialog', { name: 'Command palette' })
    await palette.getByRole('searchbox', { name: 'Search commands' }).fill('Leave a mark')
    const option = palette.getByRole('option', { name: /Leave a mark/ })
    await expect(option).toBeVisible()
    await option.click()
    await expect(palette).not.toBeVisible()
    await expect.poll(() => layerNames(page)).toContain('From a plugin')
  })

  test('the Plugins settings no longer say plugins cannot run', async ({ page }) => {
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    const settings = page.getByRole('dialog')
    await settings.getByRole('tab', { name: 'Plugins' }).click()
    await expect(settings.getByText('Plugins run from the command palette')).toBeVisible()
  })
})

test.describe('a disabled plugin', () => {
  test.use({
    storageState: async ({ baseURL }, use) => {
      if (!baseURL) throw new Error('Browser test baseURL is required')
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [
              { name: 'open-pencil:plugins', value: pluginCatalog('Leave a mark', false) }
            ]
          }
        ]
      })
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/?test')
    await new CanvasHelper(page).waitForInit()
  })

  test('has no command', async ({ page }) => {
    await page.keyboard.press(paletteShortcut())
    const palette = page.getByRole('dialog', { name: 'Command palette' })
    await palette.getByRole('searchbox', { name: 'Search commands' }).fill('Leave a mark')
    await expect(palette.getByRole('option', { name: /Leave a mark/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
  })
})
