import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { fillDriver } from '#tests/helpers/canvas/fill-driver'

// The image fill picker's adjustment sliders: a drag maps the pointer across the run, keys step
// by 0.01 of the stored value (contrast's is 0.3 of the plugin API's), and a drag that ends near
// the middle lands on 0. Each change is one undo step.

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

const fill = fillDriver(() => page)
const picker = () => page.locator('[data-picker-content]')

/** A rectangle with an image fill, selected, its picker open on the image tab. */
async function openImagePicker() {
  await page.evaluate(async () => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    // A 1x1 red PNG.
    const bytes = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0,
      0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1,
      1, 0, 24, 221, 141, 176, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])
    const hash = store.storeImage(bytes)
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Photo',
      x: 80,
      y: 80,
      width: 100,
      height: 100,
      fills: [
        {
          type: 'IMAGE',
          imageHash: hash,
          imageScaleMode: 'FILL',
          color: { r: 0, g: 0, b: 0, a: 1 },
          visible: true,
          opacity: 1
        }
      ]
    })
    store.select([node.id])
    store.requestRender()
  })
  await canvas.waitForRender()
  await page.getByTestId('fill-picker-swatch').first().click()
  await expect(page.getByTestId('fill-picker-tab-image')).toBeVisible()
  await page.getByTestId('fill-picker-tab-image').click()
  await expect(page.getByTestId('fill-picker-image-adjustments')).toBeVisible()
}

/** The adjustment slider labelled `name`: its thumb, and the middle and half-width of its run. */
async function adjustmentSlider(name: string) {
  const thumb = picker().getByRole('slider', { name, exact: true })
  const box = await picker().getByTestId(`fill-picker-${name.toLowerCase()}`).boundingBox()
  if (!box) throw new Error(`No ${name} slider`)
  return { thumb, middle: box.x + box.width / 2, half: box.width / 2, y: box.y + box.height / 2 }
}

async function dragAdjustment(name: string, from: number, to: number) {
  const { middle, half, y } = await adjustmentSlider(name)
  await page.mouse.move(middle + from * half, y)
  await page.mouse.down()
  await page.mouse.move(middle + to * half, y, { steps: 8 })
  await page.mouse.up()
}

test('a drag on an adjustment sets it, and lands on 0 near the middle, in one undo step', async () => {
  await openImagePicker()

  await dragAdjustment('Exposure', 0, 0.58)
  await expect
    .poll(async () => (await fill.selectedPaint())?.filters?.exposure)
    .toBeCloseTo(0.58, 1)

  await dragAdjustment('Exposure', 0.58, 0.03)
  await expect.poll(async () => (await fill.selectedPaint())?.filters?.exposure).toBe(0)

  await canvas.undo()
  await expect
    .poll(async () => (await fill.selectedPaint())?.filters?.exposure)
    .toBeCloseTo(0.58, 1)

  await page.keyboard.press('Escape')
  expect((await fill.selectedPaint())?.filters?.exposure).toBeCloseTo(0.58, 1)
  canvas.assertNoErrors()
})

test('arrow keys step an adjustment by a hundredth of what Figma stores, ten with Shift', async () => {
  await openImagePicker()

  const { thumb } = await adjustmentSlider('Contrast')
  await thumb.focus()
  await page.keyboard.press('ArrowRight')
  // Figma stores contrast at 0.3 of the plugin API's value, so a step is 0.01 / 0.3.
  await expect
    .poll(async () => (await fill.selectedPaint())?.filters?.contrast)
    .toBeCloseTo(1 / 30, 4)
  await page.keyboard.press('Shift+ArrowRight')
  await expect
    .poll(async () => (await fill.selectedPaint())?.filters?.contrast)
    .toBeCloseTo(11 / 30, 4)

  await (await adjustmentSlider('Tint')).thumb.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await fill.selectedPaint())?.filters?.tint).toBeCloseTo(-0.01, 4)
  canvas.assertNoErrors()
})
