import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { componentToFrameDriver } from '#tests/helpers/components/to-frame'

const COMPONENT = { component: 'COMPONENT', instance: 'INSTANCE' }
const DETACHED = { component: 'FRAME', instance: 'FRAME' }

test('the create component keys turn a main component back into a frame once confirmed', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const scene = componentToFrameDriver(() => page)
  await scene.build()

  await page.keyboard.press('Meta+Alt+k')
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  expect(await scene.types()).toEqual(COMPONENT)

  await page.keyboard.press('Meta+Alt+k')
  await dialog.getByRole('button', { name: 'Convert to frame' }).click()
  await expect.poll(() => scene.types()).toEqual(DETACHED)

  await page.keyboard.press('Meta+z')
  await expect.poll(() => scene.types()).toEqual(COMPONENT)
})

test('the layer type menu offers a main component a frame', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const scene = componentToFrameDriver(() => page)
  await scene.build()

  await page.getByRole('button', { name: 'Layer type', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Frame', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Convert to frame' }).click()
  await expect.poll(() => scene.types()).toEqual(DETACHED)
})
