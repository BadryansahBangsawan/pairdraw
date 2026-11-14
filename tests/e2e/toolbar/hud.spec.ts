import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

import { COLLABORATION_INCLUDED } from '@/constants'

test('mobile file menu opens with the keyboard and returns focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const trigger = page.getByRole('button', { name: 'File', exact: true })
  await trigger.focus()
  await trigger.press('Enter')
  await expect(page.getByRole('menu').getByRole('menuitem').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('menu')).toHaveCount(0)
  canvas.assertNoErrors()
})

test('mobile file menu names its items in the app language', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const canvas = new CanvasHelper(page)
  async function itemNames(file: string) {
    await page.getByRole('button', { name: file, exact: true }).click()
    const items = page.getByRole('menu').getByRole('menuitem')
    await expect(items.first()).toBeVisible()
    const names = await items.allInnerTexts()
    await page.keyboard.press('Escape')
    return names
  }
  await page.goto('/?test')
  await canvas.waitForInit()
  const english = await itemNames('File')
  await page.evaluate(() => localStorage.setItem('pairdraw-locale', 'de'))
  await page.reload()
  await canvas.waitForInit()
  const german = await itemNames('Datei')
  expect(german).toHaveLength(english.length)
  expect(german.filter((name) => english.includes(name))).toEqual([])
  canvas.assertNoErrors()
})

test('the phone HUD shares a local document only in a build with live rooms', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Share', exact: true })).toHaveCount(
    COLLABORATION_INCLUDED ? 1 : 0
  )
  canvas.assertNoErrors()
})
