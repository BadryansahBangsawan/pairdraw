import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

// Other specs keep the sidebar open; these start as a fresh profile does, without it.
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
              name: 'pairdraw:preferences:v1',
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
  await canvas.waitForInit({ designPanel: false })
  return canvas
}

/** The name of the only selected layer, read from the store. */
function selectedLayerName(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = [...(store?.state.selectedIds ?? [])][0]
    return id ? (store?.graph.getNode(id)?.name ?? null) : null
  })
}

test('a fresh canvas has no sidebar, and its toggle opens the layers view', async ({ page }) => {
  await openEditor(page)
  const layers = page.getByTestId('layers-panel')
  const layersToggle = page.getByTestId('editor-toggle-layers-panel')
  await expect(layers).toBeHidden()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'false')

  await layersToggle.click()
  await expect(layers).toBeVisible()
  await expect(page.getByTestId('left-panel-layers-tab')).toBeVisible()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'true')
  // The tools move with the canvas, so the toggle is still there to close the panel again.
  await layersToggle.click()
  await expect(layers).toBeHidden()
})

test('selecting a layer neither opens the sidebar nor switches its view', async ({ page }) => {
  const canvas = await openEditor(page)
  const layers = page.getByTestId('layers-panel')
  const properties = page.getByTestId('properties-panel')

  // Clear of the toolbar at the canvas's left. A drawn layer is selected.
  await canvas.drawRect(200, 100, 120, 80)
  await expect(layers).toBeHidden()
  await expect(properties).toBeHidden()

  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(layers).toBeVisible()
  await expect(page.getByTestId('layers-header')).toBeVisible()
  await expect(properties).toBeHidden()

  // Another selection, on the view the person chose, still leaves it alone.
  await page.keyboard.press('Escape')
  await canvas.selectAll()
  await expect(properties).toBeHidden()
})

test('the Design tab shows the selected layer’s properties, and follows the selection', async ({
  page
}) => {
  const canvas = await openEditor(page)
  await canvas.drawRect(200, 100, 120, 80)
  const name = await selectedLayerName(page)
  expect(name).not.toBeNull()

  await page.getByTestId('editor-toggle-layers-panel').click()
  await page.getByTestId('left-panel-design-tab').click()
  const properties = page.getByTestId('properties-panel')
  await expect(properties).toBeVisible()
  await expect(properties).toContainText(name ?? '')

  // On the design view the panel follows the selection, as it did on the right.
  await page.keyboard.press('Escape')
  await canvas.drawRect(360, 100, 90, 60)
  const next = await selectedLayerName(page)
  await expect(properties).toContainText(next ?? '')

  // The sidebar stays open where the person left it, but the next start opens on Layers: the
  // chosen view is not a preference, and nothing puts the design view back in front of them.
  await page.reload()
  await canvas.waitForInit({ designPanel: false })
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect(page.getByTestId('layers-header')).toBeVisible()
  await expect(properties).toBeHidden()
})

test('the View menu shows and closes the design view in the sidebar', async ({ page }) => {
  await openEditor(page)
  const properties = page.getByTestId('properties-panel')

  await page.getByTestId('app-main-menu').click()
  await page.getByTestId('menubar-view').click()
  await page.getByRole('menuitemcheckbox', { name: 'Design Panel' }).click()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect(properties).toBeVisible()

  await page.getByTestId('app-main-menu').click()
  await page.getByTestId('menubar-view').click()
  await page.getByRole('menuitemcheckbox', { name: 'Design Panel' }).click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()
})
