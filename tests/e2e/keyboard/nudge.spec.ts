import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function selectedPosition(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    const node = id ? store?.graph.getNode(id) : undefined
    return node ? { x: node.x, y: node.y } : null
  })
}

async function chooseNudge(page: Page, name: 'Small nudge' | 'Big nudge', value: string) {
  const row = page.locator('[data-slot="settings-row"]').filter({ hasText: name })
  await row.getByRole('combobox', { name }).click()
  await page.getByRole('option', { name: value, exact: true }).click()
}

test('the arrow keys move layers by the nudge distances set in Settings', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(200, 200, 80, 60)
  const start = await selectedPosition(page)
  if (!start) throw new Error('expected a selected rectangle')

  // Figma's 1 px and 10 px until Settings changes them.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => selectedPosition(page)).toEqual({ x: start.x + 1, y: start.y + 10 })

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await chooseNudge(page, 'Small nudge', '0.5')
  await chooseNudge(page, 'Big nudge', '8')
  await page.getByTestId('app-settings-done').click()

  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Shift+ArrowUp')
  await expect.poll(() => selectedPosition(page)).toEqual({ x: start.x + 0.5, y: start.y + 2 })

  // The distances stay for the next session.
  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(page.getByRole('combobox', { name: 'Small nudge' })).toHaveText('0.5')
  await expect(page.getByRole('combobox', { name: 'Big nudge' })).toHaveText('8')
  canvas.assertNoErrors()
})
