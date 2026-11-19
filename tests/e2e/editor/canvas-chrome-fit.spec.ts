import { expect, test, type Page } from '@playwright/test'

import type * as AppTabs from '@/app/tabs'

import { CanvasHelper } from '#tests/helpers/canvas'
import { testPath } from '#tests/helpers/paths'

async function openFixture(page: Page, fixture: string) {
  await page.route(`**/__fixtures/${fixture}`, (route) =>
    route.fulfill({ path: testPath('fixtures', fixture) })
  )
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.evaluate(async (name) => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const response = await fetch(`/__fixtures/${name}`)
    await tabs.openFileInNewTab(new File([await response.arrayBuffer()], name))
  }, fixture)
  await expect(
    page.locator('[data-slot="tab-item"]').filter({ hasText: fixture.replace(/\.fig$/, '') })
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.pairdraw?.getStore?.()?.state.preparation ?? null))
    .toBeNull()
}

/** Where the leftmost layer of the page sits on screen, and where the floating rail ends. */
function fitClearances(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const area = document.querySelector('[data-test-id="canvas-area"]')?.getBoundingClientRect()
    const rail = document.querySelector('[data-canvas-inset="left"]')?.getBoundingClientRect()
    if (!area || !rail) throw new Error('The canvas or its tool rail is missing')
    const nodes = store.graph.getChildren(store.state.currentPageId)
    const left = Math.min(...nodes.map((node) => node.x))
    return {
      layers: nodes.length,
      zoom: store.state.zoom,
      insets: store.getViewportInsets(),
      contentLeft: store.state.panX + left * store.state.zoom,
      railRight: rail.right - area.left,
      railVisible: rail.width > 0
    }
  })
}

test('an opened document fits clear of the floating tool rail', async ({ page }) => {
  await openFixture(page, 'gold-preview.fig')
  await expect(page.getByTestId('layers-panel')).toBeVisible()

  const fitted = await fitClearances(page)
  expect(fitted.layers).toBeGreaterThan(0)
  expect(fitted.railVisible).toBe(true)
  expect(fitted.contentLeft).toBeGreaterThan(fitted.railRight)
  expect(fitted.insets.left).toBeGreaterThan(0)
})

test('zoom to fit clears the rail with the sidebar closed too', async ({ page }) => {
  await openFixture(page, 'gold-preview.fig')
  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()

  await page.getByTestId('canvas-area').click({ position: { x: 500, y: 300 } })
  await page.keyboard.press('Shift+1')
  await expect
    .poll(async () => (await fitClearances(page)).contentLeft)
    .toBeGreaterThan((await fitClearances(page)).railRight)
})
