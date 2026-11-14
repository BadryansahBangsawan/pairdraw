import type { Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'

/** The selected layers: their type, and whether a shader paint is recorded on them. */
function selectedLayers(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return [...store.state.selectedIds].map((id) => {
      const node = store.graph.getNode(id)
      return {
        type: node?.type,
        shader: (node?.pluginData ?? []).some((item) => item.key === 'shader')
      }
    })
  })
}

const layerCount = (page: Page) =>
  page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getNode(store.state.currentPageId)?.childIds.length ?? -1
  })

async function openGoodies(page: Page) {
  await page.getByTestId('editor-open-goodies').click()
  const dialog = page.getByTestId('goodies-dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

test('Featured shows some of each kind, and each tab all of its own', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const dialog = await openGoodies(page)

  await expect(dialog.locator('[data-goodie-style]')).toHaveCount(3)
  await expect(dialog.locator('[data-goodie-script]')).toHaveCount(3)
  await expect(dialog.locator('[data-shader-preset]')).toHaveCount(4)

  await page.getByTestId('goodies-tab-styles').click()
  await expect(dialog.locator('[data-goodie-style]')).toHaveCount(6)
  await expect(dialog.locator('[data-goodie-script]')).toHaveCount(0)

  await page.getByTestId('goodies-tab-scripts').click()
  await expect(dialog.locator('[data-goodie-script]')).toHaveCount(5)

  await page.getByTestId('goodies-tab-shaders').click()
  await expect(dialog.locator('[data-shader-preset]')).toHaveCount(9)

  await page.getByTestId('goodies-tab-design-systems').click()
  const basics = dialog.locator('[data-goodie-library]').filter({ hasText: 'Pairdraw Basics' })
  await basics.getByRole('button', { name: 'Enable library' }).click()
  await expect(basics.getByRole('button', { name: 'Disable library' })).toBeVisible()
})

test('a script is placed on the canvas as a selected code layer', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const dialog = await openGoodies(page)

  await page.getByTestId('goodies-tab-scripts').click()
  await dialog
    .locator('[data-goodie-script="calendar"]')
    .getByRole('button', { name: 'Insert' })
    .click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => selectedLayers(page)).toEqual([{ type: 'SCRIPT', shader: false }])
  canvas.assertNoErrors()
})

test('a shader fills the selected layer, or a new rectangle that one undo takes away', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  let dialog = await openGoodies(page)
  await dialog.locator('[data-shader-preset="sunset"]').click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => selectedLayers(page)).toEqual([{ type: 'RECTANGLE', shader: true }])
  expect(await layerCount(page)).toBe(1)
  await canvas.undo()
  await expect.poll(() => layerCount(page)).toBe(0)

  await canvas.drawRect(300, 200, 120, 80)
  await expect.poll(() => selectedLayers(page)).toEqual([{ type: 'RECTANGLE', shader: false }])
  dialog = await openGoodies(page)
  await page.getByTestId('goodies-tab-shaders').click()
  await dialog.locator('[data-shader-preset="marble"]').click()
  await expect.poll(() => selectedLayers(page)).toEqual([{ type: 'RECTANGLE', shader: true }])
  expect(await layerCount(page)).toBe(1)
})

test('a style is pinned to the open conversation of the chat', async ({
  configuredChat: chat,
  page
}) => {
  const dialog = await openGoodies(page)
  await dialog
    .locator('[data-goodie-style="harbor"]')
    .getByRole('button', { name: 'Use in chat' })
    .click()
  await expect(dialog).toBeHidden()
  await expect(chat.chatColumn).toBeVisible()
  const pins = page.getByTestId('chat-pins-trigger')
  await expect(pins).toContainText('1')
  await pins.click()
  const kit = page.getByTestId('chat-pinned-style-kit')
  await expect(kit).toContainText('Harbor')
  await expect(kit).toContainText('DM Sans')
})
