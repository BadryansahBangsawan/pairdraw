import { expect, test } from '@playwright/test'

// App shortcuts that are not the field's own editing run from a plain text field too, as the
// desktop menu accelerators do.
test('⌘O asks for a file while Home’s search field has focus', async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(window, 'showOpenFilePicker', async () => {
      Reflect.set(window, '__openRequested', true)
      throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
    })
  })
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible({ timeout: 90_000 })

  const search = page.getByRole('searchbox').first()
  await expect(search).toBeFocused()

  await page.keyboard.press('ControlOrMeta+KeyO')

  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__openRequested') === true))
    .toBe(true)
})

test('the search field keeps its own editing keys', async ({ page }) => {
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible({ timeout: 90_000 })

  const search = page.getByRole('searchbox').first()
  await search.fill('pricing')

  // ⌘A selects the field's text, so typing replaces it rather than appending to it.
  await page.keyboard.press('ControlOrMeta+KeyA')
  await page.keyboard.type('x')

  await expect(search).toHaveValue('x')
})
