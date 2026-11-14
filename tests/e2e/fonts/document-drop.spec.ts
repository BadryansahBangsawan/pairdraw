import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

async function openTypographyForText(page: Page) {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = store.createShape('TEXT', 120, 120, 240, 40)
    store.updateNode(id, { text: 'Dropped font smoke' })
    store.select([id])
    return id
  })
}

test('a dropped font file appears in the font picker', async ({ page }) => {
  await openTypographyForText(page)
  const font = await readFile(join('tests/fixtures/fonts', 'NotoNaskhArabic-Regular.ttf'))

  await page.evaluate(
    async (bytes: number[]) => {
      const file = new File([new Uint8Array(bytes)], 'NotoNaskhArabic-Regular.ttf', {
        type: 'font/ttf'
      })
      const transfer = new DataTransfer()
      transfer.items.add(file)
      window.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
      )
    },
    [...font]
  )

  await page.getByTestId('font-picker-trigger').click()
  await page.getByRole('combobox', { name: 'Search fonts…' }).fill('Noto Naskh Arabic')
  await expect(
    page.getByTestId('font-picker-item').filter({ hasText: 'Noto Naskh Arabic' })
  ).toBeVisible()
})
