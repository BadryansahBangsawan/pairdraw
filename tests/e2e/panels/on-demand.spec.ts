import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

// Other specs keep both side panels open; these start as a fresh profile does, without them.
test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser test baseURL is required')
    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            {
              name: 'open-pencil:preferences:v1',
              value: JSON.stringify({
                version: 1,
                onboarding: { aiSetup: 'done' },
                chat: { canvasPrompt: false }
              })
            }
          ]
        }
      ]
    })
  }
})

async function openEditor(page: Page) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  return canvas
}

test('a fresh canvas has no side panels, and the toggle above the tools opens the layers', async ({
  page
}) => {
  await openEditor(page)
  const layers = page.getByTestId('layers-panel')
  const layersToggle = page.getByTestId('editor-toggle-layers-panel')
  await expect(layers).toBeHidden()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'false')

  await layersToggle.click()
  await expect(layers).toBeVisible()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'true')
  // The tools move with the canvas, so the toggle is still there to close the panel again.
  await layersToggle.click()
  await expect(layers).toBeHidden()
})

test('the properties panel comes for a selection and leaves with it', async ({ page }) => {
  const canvas = await openEditor(page)
  const properties = page.getByTestId('properties-panel')
  const toggle = page.getByTestId('editor-toggle-properties-panel')

  // Clear of the toolbar at the canvas's left. A drawn layer is selected.
  await canvas.drawRect(200, 100, 120, 80)
  await expect(properties).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Escape')
  await expect(properties).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await canvas.selectAll()
  await expect(properties).toBeVisible()
  // It was not the person's choice, so the next start does not find it open.
  await page.reload()
  await canvas.waitForInit()
  await expect(properties).toBeHidden()
})

test('a properties panel opened by hand stays with nothing selected, and one closed by hand stays closed', async ({
  page
}) => {
  const canvas = await openEditor(page)
  const properties = page.getByTestId('properties-panel')
  const toggle = page.getByTestId('editor-toggle-properties-panel')

  await toggle.click()
  await expect(properties).toBeVisible()
  await canvas.drawRect(200, 100, 120, 80)
  await page.keyboard.press('Escape')
  await expect(properties).toBeVisible()

  // Closed while a layer is selected, it waits for the next selection.
  await canvas.selectAll()
  await toggle.click()
  await expect(properties).toBeHidden()
  await page.keyboard.press('Escape')
  await canvas.selectAll()
  await expect(properties).toBeVisible()
})
