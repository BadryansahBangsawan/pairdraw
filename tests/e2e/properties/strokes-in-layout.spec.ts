import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { strokesInLayoutDriver } from '#tests/helpers/properties/strokes-in-layout-driver'

test('including strokes in an auto layout moves its content inside the stroke, undoably', async ({
  page
}) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const scene = strokesInLayoutDriver(() => page)
  await scene.build()
  expect(await scene.state()).toEqual({ included: false, x: 10, y: 10 })

  const toggle = page.getByRole('checkbox', { name: 'Include strokes in layout' })
  await expect(toggle).not.toBeChecked()
  await toggle.click()
  await expect(toggle).toBeChecked()
  await expect.poll(() => scene.state()).toEqual({ included: true, x: 16, y: 16 })

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z')
  await expect.poll(() => scene.state()).toEqual({ included: false, x: 10, y: 10 })
})
