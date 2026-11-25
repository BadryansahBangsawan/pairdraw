import type { Page } from '@playwright/test'

import type { Fill } from '@pairdraw/scene-graph'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { propertySection } from '#tests/helpers/properties'

/**
 * sRGB #EA3323, stored in a Display P3 document: its P3 components differ from its sRGB ones, so a
 * surface that prints or paints the stored components shows EA3323 for a colour drawn red.
 */
const STORED = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
}

async function openOnRect(
  page: Page,
  colorSpace: 'srgb' | 'display-p3',
  fill: Omit<Fill, 'opacity' | 'visible'>
) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.evaluate(
    ({ colorSpace, fill }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      store.setDocumentColorSpace(colorSpace)
      const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        name: 'Card',
        x: 60,
        y: 60,
        width: 120,
        height: 80,
        fills: [{ ...fill, opacity: 1, visible: true }]
      })
      store.select([node.id])
      store.requestRender()
    },
    { colorSpace, fill }
  )
  await canvas.waitForRender()
  return canvas
}

/** The solid fill row's hex field and its swatch. */
function fillRow(page: Page) {
  const fills = propertySection(page, 'Fill')
  return {
    hex: fills.locator('[data-property="color-hex"]').first(),
    swatch: fills.locator('[data-slot="swatch"]').first()
  }
}

test('a Display P3 document reads the fill row in sRGB and draws its swatch in its profile', async ({
  page
}) => {
  const canvas = await openOnRect(page, 'display-p3', { type: 'SOLID', color: STORED })
  const { hex, swatch } = fillRow(page)
  await expect(hex).toHaveValue('FF0000')
  await expect(swatch).toHaveAttribute(
    'style',
    /--pairdraw-fill-swatch-background: color\(display-p3 0\.9/
  )
  canvas.assertNoErrors()
})

test('an sRGB document keeps the fill row hex and swatch as before', async ({ page }) => {
  const canvas = await openOnRect(page, 'srgb', { type: 'SOLID', color: STORED })
  const { hex, swatch } = fillRow(page)
  await expect(hex).toHaveValue('EA3323')
  await expect(swatch).not.toHaveAttribute('style', /display-p3/)
  canvas.assertNoErrors()
})

test('typing into the fill row stores the sRGB colour in the document profile', async ({
  page
}) => {
  const canvas = await openOnRect(page, 'display-p3', { type: 'SOLID', color: STORED })
  const { hex } = fillRow(page)
  await hex.fill('EA3323')
  await hex.press('Enter')
  await hex.blur()
  await expect(hex).toHaveValue('EA3323')
  const stored = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = [...store.state.selectedIds][0]
    if (!id) return null
    return store.graph.getNode(id)?.fills?.[0]?.color ?? null
  })
  expect(stored?.r).not.toBeCloseTo(0.9176, 3)
  canvas.assertNoErrors()
})

test('the solid fill picker previews its sliders in the document profile', async ({ page }) => {
  const canvas = await openOnRect(page, 'display-p3', { type: 'SOLID', color: STORED })
  await page.getByTestId('fill-picker-swatch').first().click()
  const thumb = page.getByTestId('color-slider-alpha').locator('[role="slider"]')
  await expect(thumb).toHaveAttribute('style', /display-p3/)
  canvas.assertNoErrors()
})

test('the sRGB solid fill picker keeps its sliders in sRGB', async ({ page }) => {
  const canvas = await openOnRect(page, 'srgb', { type: 'SOLID', color: STORED })
  await page.getByTestId('fill-picker-swatch').first().click()
  const thumb = page.getByTestId('color-slider-alpha').locator('[role="slider"]')
  await expect(thumb).toHaveAttribute('style', /rgb\(234, 51, 35\)/)
  canvas.assertNoErrors()
})

test('the mesh fill picker previews its sliders in the document profile', async ({ page }) => {
  const canvas = await openOnRect(page, 'display-p3', {
    type: 'MESH',
    color: STORED,
    meshColumns: 1,
    meshRows: 1,
    meshPoints: [
      { color: STORED, position: { x: 0, y: 0 } },
      { color: STORED, position: { x: 1, y: 0 } },
      { color: STORED, position: { x: 0, y: 1 } },
      { color: STORED, position: { x: 1, y: 1 } }
    ]
  })
  await page.getByTestId('fill-picker-swatch').first().click()
  const thumb = page.getByTestId('color-slider-alpha').locator('[role="slider"]')
  await expect(thumb).toHaveAttribute('style', /display-p3/)
  canvas.assertNoErrors()
})
