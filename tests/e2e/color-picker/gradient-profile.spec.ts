import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

/** sRGB red, stored in a Display P3 document: its P3 components are not its sRGB ones. */
const STORED = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
}

const WHITE = { r: 1, g: 1, b: 1, a: 1 }

async function openGradient(page: Page, colorSpace: 'srgb' | 'display-p3') {
  await page.evaluate(
    ({ colorSpace, stored, white }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      store.setDocumentColorSpace(colorSpace)
      const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        name: 'Bar',
        x: 80,
        y: 80,
        width: 160,
        height: 80,
        fills: [
          {
            type: 'GRADIENT_LINEAR',
            color: stored,
            opacity: 1,
            visible: true,
            gradientStops: [
              { color: stored, position: 0 },
              { color: white, position: 1 }
            ]
          }
        ]
      })
      store.select([node.id])
      store.requestRender()
    },
    { colorSpace, stored: STORED, white: WHITE }
  )
  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByTestId('fill-picker-tab-gradient').click()
  return {
    hexes: page.locator('input[maxlength="6"]'),
    swatches: page.getByRole('button', { name: /select gradient stop/i })
  }
}

test('the gradient editor reads a Display P3 stop in its sRGB hex and swatch', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const { hexes, swatches } = await openGradient(page, 'display-p3')
  await expect(hexes.first()).toHaveValue('FF0000')
  await expect(page.getByTestId('fill-picker-gradient-bar')).toHaveAttribute('style', /display-p3/)
  await expect(swatches.first()).toHaveAttribute('style', /color\(display-p3 0\.9/)
  canvas.assertNoErrors()
})

test('an sRGB document keeps the same gradient stop as before', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const { hexes, swatches } = await openGradient(page, 'srgb')
  await expect(hexes.first()).toHaveValue('EA3323')
  await expect(swatches.first()).not.toHaveAttribute('style', /display-p3/)
  canvas.assertNoErrors()
})
