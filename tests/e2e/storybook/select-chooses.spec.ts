import { expect, test, type Page } from '@playwright/test'

/** Presses an option the way assistive technology does: a click with no pointer sequence. */
async function pressRow(page: Page, name: string): Promise<void> {
  await page.getByRole('option', { name, exact: true }).evaluate((row) => {
    if (!(row instanceof HTMLElement)) throw new Error('The option is not an element')
    row.click()
  })
}

test('a select row chooses itself on a click with no pointer sequence', async ({ page }) => {
  await page.goto('/iframe.html?id=design-system-selection-select--reactive-labels&viewMode=story')
  const trigger = page.getByRole('combobox', { name: 'Theme' })
  await expect(trigger).toHaveText('Dark')
  await trigger.click()
  await pressRow(page, 'Light')
  await expect(trigger).toHaveText('Light')
})

test('a select row chooses itself with the arrow keys and return', async ({ page }) => {
  await page.goto('/iframe.html?id=design-system-selection-select--reactive-labels&viewMode=story')
  const trigger = page.getByRole('combobox', { name: 'Theme' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[role="option"][data-highlighted]')).toHaveText('Light')
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveText('Light')
})
