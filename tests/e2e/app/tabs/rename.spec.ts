import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('double-clicking the tab in front renames its document', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const active = page.locator('[data-slot="tab-item"][data-active]')
  const name = page.getByRole('textbox', { name: 'Document name' })

  await active.getByTestId('tabbar-tab').dblclick()
  await expect(name).toBeFocused()
  await name.fill('Landing page')
  await name.press('Enter')
  await expect(name).toHaveCount(0)
  await expect(active.getByTestId('tabbar-tab')).toHaveText('Landing page')

  // Escape leaves the name as it was.
  await active.getByTestId('tabbar-tab').dblclick()
  await name.fill('Discarded')
  await name.press('Escape')
  await expect(name).toHaveCount(0)
  await expect(active.getByTestId('tabbar-tab')).toHaveText('Landing page')
})

test('a New file tab has no document to rename', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.getByTestId('tabbar-new').click()
  await page.locator('[data-slot="tab-item"][data-active]').getByTestId('tabbar-tab').dblclick()
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveCount(0)
})
