import type { Page } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const editor = useEditorSetup()

const commentTool = () => editor.page.getByTestId(toolbarToolTestId('COMMENT'))
const moveTool = () => editor.page.getByTestId(toolbarToolTestId('SELECT'))
const regions = () => editor.page.locator('[data-slot="comment-region"]:not([data-draft])')
const draftRegion = () => editor.page.locator('[data-slot="comment-region"][data-draft]')
const pins = () => editor.page.locator('[data-slot="comment-pin"]:not([data-draft])')
const composer = () => editor.page.getByRole('textbox', { name: 'Add a comment' })

/** Drags a ring around the box from its top-left corner, as a person circling a problem would. */
async function ring(page: Page, x: number, y: number, width: number, height: number) {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await page.mouse.move(box.x + x, box.y + y)
  await page.mouse.down()
  await page.mouse.move(box.x + x + width, box.y + y + height / 2, { steps: 6 })
  await page.mouse.move(box.x + x + width, box.y + y + height, { steps: 6 })
  await page.mouse.up()
}

test('dragging in the Comment tool draws a region and keeps the note on it', async () => {
  await editor.canvas.drawRect(100, 100, 200, 150)
  await commentTool().click()

  await ring(editor.page, 80, 80, 240, 190)
  await expect(draftRegion()).toHaveCount(1)
  await expect(composer()).toBeFocused()
  await composer().fill('contrast is too low')
  await composer().press('Enter')

  await expect(pins()).toHaveCount(1)
  await expect(regions()).toHaveCount(1)

  // Outside the Comment tool the stroke follows the View → Comments toggle, and comes back.
  await editor.page.keyboard.press('Escape')
  await moveTool().click()
  await expect(regions()).toHaveCount(1)
  await editor.page.keyboard.press('Shift+KeyC')
  await expect(pins()).toHaveCount(0)
  await expect(regions()).toHaveCount(0)
  await editor.page.keyboard.press('Shift+KeyC')
  await expect(pins()).toHaveCount(1)
  await expect(regions()).toHaveCount(1)
})

test('a plain click still drops a pin with no region', async () => {
  await commentTool().click()
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await editor.page.mouse.click(box.x + 320, box.y + 300)
  await expect(composer()).toBeFocused()
  await composer().press('Escape')
  // The draft pin and its note are gone; the thread drawn in the first test remains.
  await expect(pins()).toHaveCount(1)
  await expect(regions()).toHaveCount(1)
})

test('Escape takes back a stroke that was not sent, and the tool stays', async () => {
  await commentTool().click()
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await editor.page.mouse.move(box.x + 120, box.y + 320)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 300, box.y + 420, { steps: 8 })
  await expect(draftRegion()).toHaveCount(1)
  await editor.page.keyboard.press('Escape')
  await expect(draftRegion()).toHaveCount(0)
  await expect(commentTool()).toHaveAttribute('aria-pressed', 'true')
  await editor.page.mouse.up()
  // Cancelling stores nothing: only the thread from the first test is left.
  await expect(pins()).toHaveCount(1)
  await expect(moveTool()).toHaveAttribute('aria-pressed', 'false')
})
