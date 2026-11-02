import type { Page } from '@playwright/test'
import { toUint8Array } from 'js-base64'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { getSelectedNode } from '#tests/helpers/store'

// An image fill takes an image by its address as well as from a file, and places it in Stretch,
// which is a crop of the whole image as `.pen` files read in.

/** A one-pixel PNG served for the image address, so the workflow needs no network. */
const PNG = Buffer.from(
  toUint8Array(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  )
)

const ctx = useEditorSetupWithClear()

test.beforeAll(async () => {
  await ctx.page.route('https://images.example.test/**', (route) =>
    route.request().url().endsWith('/missing.png')
      ? route.fulfill({ status: 404, body: 'missing' })
      : route.fulfill({
          contentType: 'image/png',
          body: PNG,
          headers: { 'access-control-allow-origin': '*' }
        })
  )
})

/** Draws a rectangle, 160 by 120 unless given its height, and opens its fill as an image. */
async function openImageFill(page: Page, height = 120) {
  await ctx.canvas.drawRect(120, 120, 160, height)
  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByTestId('fill-picker-tab-image').click()
  const field = page.getByTestId('fill-picker-image-url')
  await expect(field).toBeVisible()
  return field
}

/** The selected layer's image fill, or none. */
async function imageFill(page: Page) {
  const node = await getSelectedNode(page)
  return node?.fills.find((fill) => fill.type === 'IMAGE')
}

test('an image address fills the layer with the image it serves', async () => {
  const page = ctx.page
  const field = await openImageFill(page)

  await field.getByRole('textbox', { name: 'Image URL' }).fill('https://images.example.test/a.png')
  await field.getByRole('button', { name: 'Load' }).click()

  await expect.poll(async () => (await imageFill(page))?.imageHash).toBeTruthy()
  const hash = (await imageFill(page))?.imageHash ?? ''
  const stored = await page.evaluate(
    (name) => window.openPencil?.getStore?.().graph.images.get(name)?.byteLength,
    hash
  )
  expect(stored).toBe(PNG.byteLength)
})

test('an address that serves no image says why and leaves the fill as it was', async () => {
  const page = ctx.page
  const field = await openImageFill(page)
  const before = await imageFill(page)

  const input = field.getByRole('textbox', { name: 'Image URL' })
  await input.fill('https://images.example.test/missing.png')
  await input.press('Enter')

  await expect(field.getByRole('alert')).toContainText('404')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  expect((await imageFill(page))?.imageHash).toBe(before?.imageHash)

  await input.fill('https://images.example.test/b.png')
  await expect(field.getByRole('alert')).toHaveCount(0)
})

test('Stretch places the image as a crop of the whole image', async () => {
  const page = ctx.page
  const field = await openImageFill(page)
  await field.getByRole('textbox', { name: 'Image URL' }).fill('https://images.example.test/a.png')
  await field.getByRole('button', { name: 'Load' }).click()
  await expect.poll(async () => (await imageFill(page))?.imageHash).toBeTruthy()

  await page.getByTestId('fill-picker-image-mode').click()
  await page.getByRole('option', { name: 'Stretch' }).click()

  await expect
    .poll(() => imageFill(page))
    .toMatchObject({
      imageScaleMode: 'CROP',
      imageTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
    })
  await expect(page.getByTestId('fill-picker-image-mode')).toContainText('Stretch')
  await expect(page.getByTestId('fill-picker-rotate-image')).toHaveCount(0)
})

test('an address without a scheme gets the picker’s own message, not the browser’s', async () => {
  const page = ctx.page
  const field = await openImageFill(page)
  const input = field.getByRole('textbox', { name: 'Image URL' })

  await input.fill('images.example.test/a.png')
  await input.press('Enter')

  await expect(field.getByRole('alert')).toHaveText(
    'Enter a full address that starts with http:// or https://, or a data URL.'
  )
  await expect(input).toHaveAttribute('aria-invalid', 'true')
})

test('Crop stays chosen when the image and layer share proportions', async () => {
  const page = ctx.page
  // The image is square, so the Fill framing a crop starts from is the whole image.
  const field = await openImageFill(page, 160)
  await field.getByRole('textbox', { name: 'Image URL' }).fill('https://images.example.test/a.png')
  await field.getByRole('button', { name: 'Load' }).click()
  await expect.poll(async () => (await imageFill(page))?.imageHash).toBeTruthy()

  await page.getByTestId('fill-picker-image-mode').click()
  await page.getByRole('option', { name: 'Crop' }).click()

  await expect.poll(async () => (await imageFill(page))?.imageScaleMode).toBe('CROP')
  await expect(page.getByTestId('fill-picker-image-mode')).toContainText('Crop')
})
