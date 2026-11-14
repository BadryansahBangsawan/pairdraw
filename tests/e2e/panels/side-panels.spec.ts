import { expect, test, type Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

async function openEditor(page: Page) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
}

async function width(page: Page, testId: string) {
  return expectDefined(await page.getByTestId(testId).boundingBox(), `${testId} bounds`).width
}

/** How far, in pixels, an element's width is from `expected`; the splitter rounds finer. */
async function widthOff(page: Page, testId: string, expected: number) {
  return Math.abs((await width(page, testId)) - expected)
}

test('the layers and properties panels close one at a time and the canvas takes their room', async ({
  page
}) => {
  await openEditor(page)
  const layersToggle = page.getByTestId('editor-toggle-layers-panel')
  const propertiesToggle = page.getByTestId('editor-toggle-properties-panel')
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(propertiesToggle).toHaveAttribute('aria-pressed', 'true')
  const canvasBefore = await width(page, 'canvas-area')
  const layersWidth = await width(page, 'layers-panel')
  const propertiesWidth = await width(page, 'properties-panel')

  await layersToggle.click()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  await expect(page.getByTestId('properties-panel')).toBeVisible()
  await expect.poll(() => width(page, 'canvas-area')).toBeGreaterThan(canvasBefore + 100)

  await propertiesToggle.click()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect
    .poll(() => width(page, 'canvas-area'))
    .toBeGreaterThan(canvasBefore + layersWidth + propertiesWidth - 40)

  // Each reopens as wide as it was.
  await layersToggle.click()
  await propertiesToggle.click()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect(page.getByTestId('properties-panel')).toBeVisible()
  await expect.poll(() => widthOff(page, 'layers-panel', layersWidth)).toBeLessThanOrEqual(1)
  await expect
    .poll(() => widthOff(page, 'properties-panel', propertiesWidth))
    .toBeLessThanOrEqual(1)
  await expect.poll(() => widthOff(page, 'canvas-area', canvasBefore)).toBeLessThanOrEqual(1)
})

test('a closed side panel stays closed after a reload', async ({ page }) => {
  await openEditor(page)
  await page.getByTestId('editor-toggle-properties-panel').click()
  await expect(page.getByTestId('properties-panel')).toBeHidden()

  await page.reload()
  await new CanvasHelper(page).waitForInit()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect(page.getByTestId('editor-toggle-properties-panel')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
})

test('the chat column opens and closes beside a closed properties panel', async ({ page }) => {
  await openEditor(page)
  const chat = new ChatHarness(page)
  await page.getByTestId('editor-toggle-properties-panel').click()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  const canvasBefore = await width(page, 'canvas-area')

  await chat.openChat()
  await expect(chat.chatColumn).toBeVisible()
  await expect(page.getByTestId('properties-panel')).toBeHidden()

  await chat.closeChat()
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(page.getByTestId('editor-toggle-properties-panel')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await expect.poll(() => widthOff(page, 'canvas-area', canvasBefore)).toBeLessThanOrEqual(1)
})

test('the comment tool opens a closed properties panel for its list and closes it after', async ({
  page
}) => {
  await openEditor(page)
  const toggle = page.getByTestId('editor-toggle-properties-panel')
  await toggle.click()
  await expect(page.getByTestId('properties-panel')).toBeHidden()

  // Clear of the toolbar at the canvas's left.
  await page.getByTestId('canvas-area').click({ position: { x: 200, y: 20 } })
  await page.keyboard.press('KeyC')
  await expect(page.getByTestId('properties-panel')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('properties-panel')).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})
