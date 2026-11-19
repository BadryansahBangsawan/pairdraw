import { expect, test, type Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'
import { openDesignPanel } from '#tests/helpers/properties'

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

test('the sidebar closes and the canvas takes its room, and it reopens as wide as it was', async ({
  page
}) => {
  await openEditor(page)
  const layersToggle = page.getByTestId('editor-toggle-layers-panel')
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'true')
  const canvasBefore = await width(page, 'canvas-area')
  const sidebarWidth = await width(page, 'layers-panel')

  await layersToggle.click()
  await expect(layersToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  await expect.poll(() => width(page, 'canvas-area')).toBeGreaterThan(canvasBefore + 100)

  await layersToggle.click()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect.poll(() => widthOff(page, 'layers-panel', sidebarWidth)).toBeLessThanOrEqual(1)
  await expect.poll(() => widthOff(page, 'canvas-area', canvasBefore)).toBeLessThanOrEqual(1)
})

/**
 * Toggles the sidebar and reports, for each of the next frames, whether the canvas showed a
 * drawing made for its size. A frame is read at the start of the one after it, once it was shown.
 */
async function framesAtCanvasSize(page: Page, toggle: string): Promise<boolean[]> {
  return page.evaluate(async (testId) => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-test-id="canvas-element"]')
    const button = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)
    if (!canvas || !button) throw new Error('Missing canvas or panel toggle')
    const nextFrame = () =>
      new Promise<number>((resolve) => {
        requestAnimationFrame(resolve)
      })
    button.click()
    await nextFrame()
    const shown: boolean[] = []
    for (let frame = 0; frame < 3; frame++) {
      await nextFrame()
      shown.push(Math.round(canvas.width / devicePixelRatio) === canvas.clientWidth)
    }
    return shown
  }, toggle)
}

test('the canvas never shows a stretched frame as the sidebar opens or closes', async ({
  page
}) => {
  await openEditor(page)
  for (const toggle of ['editor-toggle-layers-panel']) {
    // Closing, then opening again.
    expect(await framesAtCanvasSize(page, toggle)).toEqual([true, true, true])
    expect(await framesAtCanvasSize(page, toggle)).toEqual([true, true, true])
  }
})

test('a closed sidebar stays closed after a reload', async ({ page }) => {
  await openEditor(page)
  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()

  await page.reload()
  await new CanvasHelper(page).waitForInit({ designPanel: false })
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  await expect(page.getByTestId('editor-toggle-layers-panel')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
})

test('a closed sidebar reopens on the design view the person left', async ({ page }) => {
  await openEditor(page)
  await openDesignPanel(page)
  await expect(page.getByTestId('properties-panel')).toBeVisible()

  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()

  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('properties-panel')).toBeVisible()
})

test('the chat column opens and closes beside a closed sidebar', async ({ page }) => {
  await openEditor(page)
  const chat = new ChatHarness(page)
  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  const canvasBefore = await width(page, 'canvas-area')

  await chat.openChat()
  await expect(chat.chatColumn).toBeVisible()
  await expect(page.getByTestId('layers-panel')).toBeHidden()

  await chat.closeChat()
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  await expect(page.getByTestId('editor-toggle-layers-panel')).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await expect.poll(() => widthOff(page, 'canvas-area', canvasBefore)).toBeLessThanOrEqual(1)
})

test('the comment tool shows its list in the design view of a closed sidebar', async ({ page }) => {
  await openEditor(page)
  await page.getByTestId('editor-toggle-layers-panel').click()
  await expect(page.getByTestId('layers-panel')).toBeHidden()

  // Clear of the toolbar at the canvas's left.
  await page.getByTestId('canvas-area').click({ position: { x: 200, y: 20 } })
  await page.keyboard.press('KeyC')
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect(page.getByTestId('properties-panel')).toBeVisible()
  // The comments list takes the design view while the tool is active, as it took the panel.
  const comments = page.locator('[data-slot="comments-panel"]')
  await expect(comments).toBeVisible()

  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('properties-panel')).toBeVisible()
  await expect(comments).toBeHidden()
})
