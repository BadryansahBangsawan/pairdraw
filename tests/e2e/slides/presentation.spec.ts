import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { slidesDriver } from '#tests/helpers/canvas/slides'

async function openDeck(page: Page, names: string[]) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  canvas.errors.length = 0
  const slides = slidesDriver(page)
  const ids = await slides.createDeck(names)
  await canvas.waitForRender()
  return { canvas, slides, ids }
}

function stage(page: Page) {
  return page.getByRole('region', { name: 'Presentation' })
}

function selectionSize(page: Page) {
  return page.evaluate(() => window.openPencil?.getStore?.()?.state.selectedIds.size)
}

test('⌘↩ presents the slides full window; arrows, Space, and Enter step; Escape leaves', async ({
  page
}) => {
  const { canvas, slides } = await openDeck(page, ['Cover', 'Agenda', 'Thanks'])
  const before = await slides.viewport()

  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()
  await expect(page.getByTestId('layers-panel')).toBeHidden()
  expect(await slides.presentedSlide()).toBe('Cover')

  await page.keyboard.press('ArrowRight')
  await expect.poll(() => slides.presentedSlide()).toBe('Agenda')
  await page.keyboard.press('Space')
  await expect.poll(() => slides.presentedSlide()).toBe('Thanks')
  // The last slide stays put.
  await page.keyboard.press('Enter')
  await expect.poll(() => slides.presentedSlide()).toBe('Thanks')
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => slides.presentedSlide()).toBe('Agenda')
  await expect(page.getByTestId('presentation-position')).toHaveText(/2/)

  await page.keyboard.press('Escape')
  await expect(stage(page)).toBeHidden()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  await expect.poll(() => slides.presentedSlide()).toBeNull()
  // The canvas returns to where it looked.
  await expect.poll(() => slides.viewport()).toEqual(before)
  canvas.assertNoErrors()
})

test('the Present button starts from the selected slide and its controls step and exit', async ({
  page
}) => {
  const { canvas, slides, ids } = await openDeck(page, ['Cover', 'Agenda', 'Thanks'])
  await page.evaluate((id) => window.openPencil?.getStore?.()?.select([id]), ids[1])

  await page.getByTestId('editor-start-presentation').click()
  await expect(stage(page)).toBeVisible()
  expect(await slides.presentedSlide()).toBe('Agenda')

  const controls = page.getByRole('toolbar', { name: 'Presentation' })
  await page.mouse.move(10, 10)
  await controls.getByRole('button', { name: 'Next slide' }).click()
  await expect.poll(() => slides.presentedSlide()).toBe('Thanks')
  await expect(controls.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  await controls.getByRole('button', { name: /Exit presentation/ }).click()
  await expect(stage(page)).toBeHidden()
  canvas.assertNoErrors()
})

test('the area around the slide is blacked out and a click there does not select', async ({
  page
}) => {
  const { canvas } = await openDeck(page, ['Cover', 'Agenda'])
  // A screen wider than 16:9 leaves bars either side of the fitted slide, and a layer lies just
  // right of the slide, under the right-hand bar.
  await page.setViewportSize({ width: 1600, height: 800 })
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Beside the slide',
      x: 965,
      y: 0,
      width: 100,
      height: 540
    })
    store.requestRender()
  })
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()

  const letterbox = page.getByTestId('presentation-letterbox')
  await expect(letterbox.first()).toBeVisible()
  const bars = await letterbox.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    })
  )
  const bar = bars.toSorted((a, b) => b.x - a.x)[0]
  if (!bar || bar.width < 4) throw new Error('Expected a bar right of the slide')
  await page.mouse.click(bar.x + bar.width / 2, bar.y + bar.height / 2)
  expect(await selectionSize(page)).toBe(0)

  // A click on the slide itself does not select it either.
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected a viewport')
  await page.mouse.click(viewport.width / 2, viewport.height / 2)
  expect(await selectionSize(page)).toBe(0)
  canvas.assertNoErrors()
})

test('neither a middle-button drag nor the Hand tool moves the slide', async ({ page }) => {
  const { canvas, slides } = await openDeck(page, ['Cover', 'Agenda'])
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()
  await expect.poll(async () => (await slides.viewport()).zoom).toBeGreaterThan(0)
  const fitted = await slides.viewport()

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected a viewport')
  const x = viewport.width / 2
  const y = viewport.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(x + 200, y + 120, { steps: 5 })
  await page.mouse.up({ button: 'middle' })
  expect(await slides.viewport()).toEqual(fitted)

  await page.evaluate(() => window.openPencil?.getStore?.()?.setTool('HAND'))
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 200, y - 120, { steps: 5 })
  await page.mouse.up()
  expect(await slides.viewport()).toEqual(fitted)
  expect(await slides.presentedSlide()).toBe('Cover')
  canvas.assertNoErrors()
})

test('the wheel steps through fitted slides, one slide a turn', async ({ page }) => {
  const { canvas, slides } = await openDeck(page, ['Cover', 'Agenda', 'Thanks'])
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected a viewport')
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => slides.presentedSlide()).toBe('Agenda')
  // The wheel rests between turns.
  await page.waitForTimeout(400)
  await page.mouse.wheel(0, -400)
  await expect.poll(() => slides.presentedSlide()).toBe('Cover')
  canvas.assertNoErrors()
})

test('focus moves to the presentation and back to the control that started it', async ({
  page
}) => {
  const { canvas } = await openDeck(page, ['Cover', 'Agenda'])
  const present = page.getByTestId('editor-start-presentation')
  await present.focus()
  await page.keyboard.press('Enter')
  await expect(stage(page)).toBeVisible()
  await expect(stage(page)).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(stage(page)).toBeHidden()
  await expect(page.getByTestId('editor-start-presentation')).toBeFocused()
  canvas.assertNoErrors()
})

test('a focused control stays visible while the pointer rests', async ({ page }) => {
  const { canvas } = await openDeck(page, ['Cover', 'Agenda'])
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()
  const controls = page.getByRole('toolbar', { name: 'Presentation' })
  await expect(controls).toHaveAttribute('data-idle', 'true', { timeout: 5000 })
  await expect(controls).toHaveCSS('opacity', '0')

  await controls.getByRole('button', { name: 'Next slide' }).focus()
  await expect(controls).toHaveCSS('opacity', '1')
  // Still visible once the pointer has rested again.
  await expect(controls).toHaveAttribute('data-idle', 'true', { timeout: 5000 })
  await expect(controls).toHaveCSS('opacity', '1')
  canvas.assertNoErrors()
})

test('a long page at 100% scrolls with the keys before stepping to the next slide', async ({
  page
}) => {
  const { canvas, slides, ids } = await openDeck(page, ['Landing', 'Pricing'])
  await page.evaluate((id) => {
    const store = window.openPencil?.getStore?.()
    store?.graph.updateNode(id, { width: 1280, height: 4000 })
    store?.requestRender()
  }, ids[0])

  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeVisible()
  const controls = page.getByRole('toolbar', { name: 'Presentation' })
  await page.mouse.move(10, 10)
  await controls.getByRole('button', { name: 'Actual size' }).click()
  await expect.poll(async () => (await slides.viewport()).zoom).toBe(1)

  const top = (await slides.viewport()).panY
  await page.keyboard.press('PageDown')
  await expect.poll(async () => (await slides.viewport()).panY).toBeLessThan(top)
  expect(await slides.presentedSlide()).toBe('Landing')

  await page.keyboard.press('End')
  await expect.poll(() => slides.presentedSlide()).toBe('Pricing')
  canvas.assertNoErrors()
})

test('a page without frames has nothing to present and stays in the editor', async ({ page }) => {
  const { canvas, slides } = await openDeck(page, [])
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(stage(page)).toBeHidden()
  await expect(page.getByTestId('layers-panel')).toBeVisible()
  expect(await slides.presentedSlide()).toBeNull()
  canvas.assertNoErrors()
})
