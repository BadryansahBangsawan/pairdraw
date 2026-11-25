import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { propertySection } from '#tests/helpers/properties'

/**
 * sRGB #EA3323, stored in a Display P3 document: its P3 components differ from its sRGB ones,
 * so a hex field that prints the stored components shows EA3323 for a colour the canvas draws red.
 */
const STORED = {
  r: 0.9174875573251657,
  g: 0.20028680774084662,
  b: 0.13856059121111408,
  a: 1
}

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/?test')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

async function showShadowColor(colorSpace: 'srgb' | 'display-p3') {
  await canvas.clearCanvas()
  await page.evaluate(
    ({ colorSpace, color }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      store.setDocumentColorSpace(colorSpace)
      const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        name: 'Card',
        x: 60,
        y: 60,
        width: 120,
        height: 80,
        fills: [
          {
            type: 'SOLID',
            color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
            opacity: 1,
            visible: true
          }
        ],
        effects: [
          {
            type: 'DROP_SHADOW',
            color,
            offset: { x: 0, y: 12 },
            radius: 8,
            spread: 0,
            visible: true
          }
        ]
      })
      store.select([node.id])
      store.requestRender()
    },
    { colorSpace, color: STORED }
  )
  await canvas.waitForRender()
  const effects = propertySection(page, 'Effects')
  const expand = effects.getByRole('button', { name: 'Expand effect settings' })
  if (await expand.isVisible().catch(() => false)) await expand.click()
  return effects.getByTestId('color-hex-input')
}

test('a Display P3 document reads a stored color as the sRGB hex it draws', async () => {
  const hex = await showShadowColor('display-p3')
  await expect(hex).toHaveValue('FF0000')
  canvas.assertNoErrors()
})

test('an sRGB document keeps reading the numbers it stores', async () => {
  const hex = await showShadowColor('srgb')
  await expect(hex).toHaveValue('EA3323')
  canvas.assertNoErrors()
})

test('typing a hex into a Display P3 document shows the same hex back', async () => {
  const hex = await showShadowColor('display-p3')
  await hex.fill('EA3323')
  await hex.press('Enter')
  await hex.blur()
  await expect(hex).toHaveValue('EA3323')
  const stored = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = [...store.state.selectedIds][0]
    if (!id) return null
    const effect = store.graph.getNode(id)?.effects[0]
    return effect && 'color' in effect ? effect.color : null
  })
  // Stored as the document's Display P3 components, not as the sRGB numbers typed.
  expect(stored?.r).not.toBeCloseTo(0.9176, 3)
  canvas.assertNoErrors()
})
