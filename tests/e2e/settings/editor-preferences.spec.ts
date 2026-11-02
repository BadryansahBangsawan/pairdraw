import { expect, test, type Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'

async function openEditor(page: Page) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  return canvas
}

async function openEditorSettings(page: Page) {
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-editor').click()
  await expect(page.getByTestId('settings-editor-panel')).toBeVisible()
}

/** Closes Settings and waits until its dialog has gone, so the canvas gets the next wheel. */
async function closeSettings(page: Page) {
  await page.getByTestId('app-settings-done').click()
  await expect(page.getByTestId('settings-editor-panel')).toBeHidden()
}

function editorState(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return {
      zoom: store.state.zoom,
      panY: store.state.panY,
      showPixelGrid: store.state.showPixelGrid !== false,
      halfPixel: store.state.snappingPreferences.halfPixel === true
    }
  })
}

async function wheelOverCanvas(canvas: CanvasHelper, deltaY: number) {
  const box = expectDefined(await canvas.canvas.boundingBox(), 'canvas bounds')
  await canvas.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await canvas.page.mouse.wheel(0, deltaY)
  await canvas.waitForRender()
}

test('the pixel grid stays as Shift+quote left it across a reload', async ({ page }) => {
  const canvas = await openEditor(page)
  expect((await editorState(page)).showPixelGrid).toBe(true)

  await page.keyboard.press('Shift+Quote')
  await expect.poll(async () => (await editorState(page)).showPixelGrid).toBe(false)
  await page.reload()
  await canvas.waitForInit()
  expect((await editorState(page)).showPixelGrid).toBe(false)

  await openEditorSettings(page)
  const shown = page.getByRole('switch', { name: 'Show pixel grid' })
  await expect(shown).not.toBeChecked()
  await shown.click()
  await expect.poll(async () => (await editorState(page)).showPixelGrid).toBe(true)
})

test('half-pixel snapping reaches the editor and stays across a reload', async ({ page }) => {
  const canvas = await openEditor(page)
  await openEditorSettings(page)
  const halfPixel = page.getByRole('switch', { name: 'Snap to half pixels' })
  await expect(halfPixel).not.toBeChecked()
  await halfPixel.click()
  await expect.poll(async () => (await editorState(page)).halfPixel).toBe(true)

  await page.reload()
  await canvas.waitForInit()
  expect((await editorState(page)).halfPixel).toBe(true)
})

test('a plain wheel zooms once Zoom with scroll wheel is on, and Invert flips it', async ({
  page
}) => {
  const canvas = await openEditor(page)
  const start = await editorState(page)
  await wheelOverCanvas(canvas, 100)
  // By default the wheel scrolls the canvas and leaves the zoom alone.
  const scrolled = await editorState(page)
  expect(scrolled.zoom).toBe(start.zoom)
  expect(scrolled.panY).not.toBe(start.panY)

  await openEditorSettings(page)
  await page.getByRole('switch', { name: 'Zoom with scroll wheel' }).click()
  await closeSettings(page)
  await wheelOverCanvas(canvas, 100)
  const zoomedOut = await editorState(page)
  expect(zoomedOut.zoom).toBeLessThan(scrolled.zoom)

  await openEditorSettings(page)
  await page.getByRole('switch', { name: 'Invert zoom direction' }).click()
  await closeSettings(page)
  await wheelOverCanvas(canvas, 100)
  expect((await editorState(page)).zoom).toBeGreaterThan(zoomedOut.zoom)
  canvas.assertNoErrors()
})

test.describe('on a high-density display', () => {
  test.use({ deviceScaleFactor: 2 })

  test('Ultralight mode turns animations off at once and asks for a reload for the rest', async ({
    page
  }) => {
    const canvas = await openEditor(page)
    await openEditorSettings(page)
    const ultralight = page.getByRole('switch', { name: 'Ultralight mode' })
    await expect(ultralight).not.toBeChecked()
    await ultralight.click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
    await expect(page.getByText('Reload Pairdraw to apply this change.')).toBeVisible()

    await page.reload()
    await canvas.waitForInit()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
    // One device pixel per CSS pixel, whatever the display.
    const scale = await page.evaluate(() => {
      const element = document.querySelector('[data-test-id="scene-canvas-element"]')
      if (!(element instanceof HTMLCanvasElement)) return null
      return element.width / element.clientWidth
    })
    expect(scale).toBeCloseTo(1, 1)
    canvas.assertNoErrors()
  })
})
