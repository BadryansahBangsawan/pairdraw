import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function buildScene(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const pageId = store.state.currentPageId
    const card = store.graph.createNode('FRAME', pageId, {
      name: 'Card',
      x: 2400,
      y: 1800,
      width: 320,
      height: 200
    })
    const badge = store.graph.createNode('RECTANGLE', card.id, {
      name: 'Badge',
      x: 16,
      y: 16,
      width: 48,
      height: 24
    })
    store.graph.createNode('RECTANGLE', pageId, { name: 'Backdrop', width: 100, height: 100 })
    store.requestRender()
    return { badgeId: badge.id }
  })
}

const selection = (page: Page) =>
  page.evaluate(() => [...(window.pairdraw?.getStore?.().state.selectedIds ?? [])])

const pan = (page: Page) =>
  page.evaluate(() => {
    const state = window.pairdraw?.getStore?.().state
    return state ? [state.panX, state.panY] : []
  })

test('Find layers lists the page, finds a nested layer by name, and goes to it', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const { badgeId } = await buildScene(page)
  const panBefore = await pan(page)

  await page.keyboard.press('ControlOrMeta+KeyF')
  const dialog = page.getByRole('dialog', { name: 'Find layers' })
  await expect(dialog).toBeVisible()
  // Top-level layers show from the start; nested ones come with a search.
  await expect(dialog.getByRole('option', { name: 'Card' })).toBeVisible()
  await expect(dialog.getByRole('option', { name: 'Backdrop' })).toBeVisible()
  await expect(dialog.getByRole('option', { name: 'Badge' })).toHaveCount(0)

  await page.keyboard.type('badg')
  await expect(dialog.getByRole('option', { name: 'Badge' })).toBeVisible()
  await expect(dialog.getByRole('option', { name: 'Backdrop' })).toHaveCount(0)
  await page.keyboard.press('Enter')

  await expect(dialog).toBeHidden()
  await expect.poll(() => selection(page)).toEqual([badgeId])
  // The layer was far off screen, so the view moved to it.
  await expect.poll(() => pan(page)).not.toEqual(panBefore)
  canvas.assertNoErrors()
})

test('a name nothing matches says so, and Escape closes without changing the selection', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await buildScene(page)

  await page.keyboard.press('ControlOrMeta+KeyF')
  const dialog = page.getByRole('dialog', { name: 'Find layers' })
  await page.keyboard.type('zzz')
  await expect(dialog.getByText('No layers found.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(await selection(page)).toEqual([])
})
