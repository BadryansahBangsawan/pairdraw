import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

async function publishLibrary(page: Page, id: string, name: string) {
  await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageNode = store.graph.getNode(store.state.currentPageId)
    if (!pageNode) throw new Error('Current page missing')
    store.graph.createNode('COMPONENT', pageNode.id, {
      name: 'Button',
      componentKey: 'design-system-button',
      width: 80,
      height: 32
    })
  })
  await page.getByTestId('left-panel-assets-tab').click()
  await page.getByRole('button', { name: 'Manage libraries' }).click()
  await page.getByRole('button', { name: 'Publish library' }).click()
  const publish = page.getByRole('dialog').filter({ hasText: 'Publish library' })
  await publish.getByLabel('Library ID').fill(id)
  await publish.getByLabel('Library name').fill(name)
  await publish.getByRole('button', { name: 'Publish library' }).click()
  await expect(publish.getByLabel('Library ID')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('asset-libraries-dialog')).toBeHidden()
}

test('Home offers the built-in design system Goodies lists, and starts a design with it', async ({
  page
}) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  await canvas.waitForInit()

  await page.getByTestId('tabbar-new').click()
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('navigation').getByRole('button', { name: 'Design systems' }).click()
  await expect(home.getByRole('heading', { name: 'Design systems', exact: true })).toBeVisible()
  // Nothing is published on a fresh profile, so the built-in library is the one design system.
  const library = home.getByRole('button', { name: /^New design with / })
  await expect(library).toHaveCount(1)
  await library.click()

  await expect(home).toBeHidden()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  const enabled = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    return store?.graph.enabledLibraries.get('pairdraw-basics')?.enabled ?? false
  })
  expect(enabled).toBe(true)
})

test('a design system on Home starts a new design with its library turned on', async ({ page }) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  await canvas.waitForInit()
  await publishLibrary(page, 'home-design-system', 'Home design system')

  await page.getByTestId('tabbar-new').click()
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('navigation').getByRole('button', { name: 'Design systems' }).click()
  const library = home.getByRole('button', { name: 'New design with Home design system' })
  await expect(library).toBeVisible()

  // The search narrows the design systems by name.
  await home.getByLabel('Search files…').fill('nothing like it')
  await expect(library).toBeHidden()
  await home.getByLabel('Search files…').fill('home design')
  await library.click()

  await expect(home).toBeHidden()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  const enabled = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    return store?.graph.enabledLibraries.get('home-design-system')?.enabled ?? false
  })
  expect(enabled).toBe(true)
})
