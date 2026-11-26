import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

/** Presses an option the way assistive technology does: a click with no pointer sequence. */
async function pressRow(page: Page, name: string): Promise<void> {
  await page.getByRole('option', { name, exact: true }).evaluate((row) => {
    if (!(row instanceof HTMLElement)) throw new Error('The option is not an element')
    row.click()
  })
}

test('language can be changed from General settings and persists', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await page.getByTestId('settings-language').click()
  await page.getByRole('option', { name: 'Русский' }).click()
  await expect(page.getByTestId('app-settings-dialog')).toContainText('Настройки')
  await expect(page.getByRole('combobox', { name: 'Тема', exact: true })).toHaveText('Тёмная')
  await expect(page.getByRole('combobox', { name: 'Анимации' })).toHaveText('Как в системе')

  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await expect(page.getByTestId('settings-language')).toContainText('Русский')

  await page.getByTestId('settings-language').click()
  await page.getByRole('option', { name: 'English' }).click()
  await expect(page.getByTestId('app-settings-dialog')).toContainText('Settings')
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveText('Dark')
  await expect(page.getByRole('combobox', { name: 'Animations' })).toHaveText('Follow system')
})

test('a theme row pressed without a pointer sequence changes the theme and persists', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true })
  await theme.click()
  await pressRow(page, 'Light')
  await expect(theme).toHaveText('Light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByTestId('settings-language').click()
  await pressRow(page, 'Русский')
  await expect(page.getByTestId('app-settings-dialog')).toContainText('Настройки')

  await page.reload()
  await canvas.waitForInit()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTestId('app-settings-trigger').click()
  await expect(page.getByTestId('settings-language')).toContainText('Русский')
})

test('general snapping preferences persist and apply to editor sessions', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(page.getByTestId('settings-editor-panel')).toBeVisible()
  const geometry = page.getByRole('switch', { name: 'Snap to geometry' })
  const objects = page.getByRole('switch', { name: 'Snap to objects' })
  const pixelGrid = page.getByRole('switch', { name: 'Snap to pixel grid' })
  await expect(geometry).toBeChecked()
  await expect(objects).toBeChecked()
  await expect(pixelGrid).toBeChecked()

  await geometry.click()
  await objects.click()
  await pixelGrid.click()
  await expect
    .poll(() =>
      page.evaluate(() => window.pairdraw?.getStore?.().state.snappingPreferences ?? null)
    )
    .toEqual({ geometry: false, objects: false, pixelGrid: false, halfPixel: false })

  await page.getByTestId('app-settings-done').click()
  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(geometry).not.toBeChecked()
  await expect(objects).not.toBeChecked()
  await expect(pixelGrid).not.toBeChecked()
  await expect(
    page.evaluate(() => window.pairdraw?.getStore?.().state.snappingPreferences ?? null)
  ).resolves.toEqual({ geometry: false, objects: false, pixelGrid: false, halfPixel: false })

  await geometry.click()
  await objects.click()
  await pixelGrid.click()
})

test('progressive tiled rendering preference persists and URL overrides take precedence', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  const tiled = page.getByRole('switch', { name: 'Progressive rendering' })
  await expect(tiled).not.toBeChecked()
  await tiled.click()
  await expect(page.getByText('Reload Pairdraw to apply this change.')).toBeVisible()

  await page.reload()
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(tiled).toBeChecked()
  await expect(
    page.evaluate(() =>
      window.pairdraw
        ?.getStore?.()
        .canvasRenderers.some(
          (renderer) => renderer.tracksSceneSettlement && renderer.tiledSceneEnabled
        )
    )
  ).resolves.toBe(true)

  await page.goto('/?test&renderer=retained')
  await canvas.waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(tiled).toBeChecked()
  await expect(
    page.getByText(/current session renderer is controlled by a URL override/i)
  ).toBeVisible()
  await expect(
    page.evaluate(() =>
      window.pairdraw
        ?.getStore?.()
        .canvasRenderers.every(
          (renderer) => !renderer.tracksSceneSettlement || !renderer.tiledSceneEnabled
        )
    )
  ).resolves.toBe(true)

  await tiled.click()
})

test('Preferences menu snapping controls use the same preferences', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-main-menu').click()
  await page.getByTestId('menubar-view').click()
  await page.getByRole('menuitem', { name: 'Preferences' }).hover()
  const geometry = page.getByRole('menuitemcheckbox', { name: 'Snap to geometry' })
  const objects = page.getByRole('menuitemcheckbox', { name: 'Snap to objects' })
  const pixelGrid = page.getByRole('menuitemcheckbox', { name: 'Snap to pixel grid' })
  await expect(geometry).toBeChecked()
  await expect(objects).toBeChecked()
  await expect(pixelGrid).toBeChecked()
  await objects.click()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(page.getByRole('switch', { name: 'Snap to objects' })).not.toBeChecked()
  await page.getByRole('switch', { name: 'Snap to objects' }).click()
})

test('settings shortcut preserves the last visited section', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-services').click()
  await page.getByTestId('app-settings-done').click()

  await page.keyboard.press('ControlOrMeta+,')
  await expect(page.getByTestId('settings-media-panel')).toBeVisible()
})
