import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { slidesDriver } from '#tests/helpers/canvas/slides'

async function openSlidesPanel(page: Page) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  canvas.errors.length = 0
  await page.getByTestId('left-panel-slides-tab').click()
  return canvas
}

function slidesList(page: Page) {
  return page.getByRole('list', { name: 'Slides on this page' })
}

test('the Slides panel lists top-level frames in layer order with thumbnails', async ({ page }) => {
  const canvas = await openSlidesPanel(page)
  const slides = slidesDriver(page)
  await slides.createDeck(['Cover', 'Agenda', 'Thanks'])
  await canvas.waitForRender()

  const items = slidesList(page).getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(slidesList(page).getByRole('button', { name: /^Slide \d/ })).toHaveText([
    /Cover/,
    /Agenda/,
    /Thanks/
  ])
  const thumbnail = items.first().getByTestId('slides-thumbnail')
  await expect(thumbnail).toBeVisible()
  await expect(thumbnail).toHaveAttribute('src', /.+/)
  canvas.assertNoErrors()
})

test('clicking a slide selects it and brings it into view', async ({ page }) => {
  const canvas = await openSlidesPanel(page)
  const slides = slidesDriver(page)
  const [, agenda] = await slides.createDeck(['Cover', 'Agenda', 'Thanks'])
  await canvas.waitForRender()

  await slidesList(page).getByRole('button', { name: 'Slide 2: Agenda' }).click()
  await expect(slidesList(page).getByRole('button', { name: 'Slide 2: Agenda' })).toHaveAttribute(
    'aria-current',
    'true'
  )
  const selected = await page.evaluate(() => [
    ...(window.openPencil?.getStore?.()?.state.selectedIds ?? [])
  ])
  expect(selected).toEqual([agenda])
  canvas.assertNoErrors()
})

test('dragging a slide reorders the page, and undo puts it back', async ({ page }) => {
  const canvas = await openSlidesPanel(page)
  const slides = slidesDriver(page)
  await slides.createDeck(['Cover', 'Agenda', 'Thanks'])
  await canvas.waitForRender()

  const items = slidesList(page).getByRole('listitem')
  const target = await items.nth(2).boundingBox()
  if (!target) throw new Error('Expected the last slide on screen')
  // Just above the last slide's bottom edge, which clearly drops after it.
  await items.first().dragTo(items.nth(2), {
    targetPosition: { x: target.width / 2, y: target.height - 8 }
  })
  await expect.poll(() => slides.slideNames()).toEqual(['Agenda', 'Thanks', 'Cover'])

  await canvas.undo()
  await expect.poll(() => slides.slideNames()).toEqual(['Cover', 'Agenda', 'Thanks'])
  canvas.assertNoErrors()
})

test('Alt with an arrow moves the focused slide and keeps it focused', async ({ page }) => {
  const canvas = await openSlidesPanel(page)
  const slides = slidesDriver(page)
  await slides.createDeck(['Cover', 'Agenda', 'Thanks'])
  await canvas.waitForRender()

  await slidesList(page).getByRole('button', { name: 'Slide 1: Cover' }).focus()
  await page.keyboard.press('Alt+ArrowDown')
  await expect.poll(() => slides.slideNames()).toEqual(['Agenda', 'Cover', 'Thanks'])
  await expect(slidesList(page).getByRole('button', { name: 'Slide 2: Cover' })).toBeFocused()
  canvas.assertNoErrors()
})

test('an empty page explains how slides are made', async ({ page }) => {
  const canvas = await openSlidesPanel(page)
  await slidesDriver(page).createDeck([])
  await canvas.waitForRender()

  await expect(page.getByTestId('slides-empty')).toBeVisible()
  await expect(page.getByTestId('slides-present')).toBeDisabled()
  canvas.assertNoErrors()
})
