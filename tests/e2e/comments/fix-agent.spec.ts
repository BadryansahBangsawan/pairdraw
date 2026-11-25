import type { Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const regions = (page: Page) => page.locator('[data-slot="comment-region"]:not([data-draft])')
const pins = (page: Page) => page.locator('[data-slot="comment-pin"]:not([data-draft])')

/** Drags a ring around the box from its top-left corner, as a person circling a problem would. */
async function ring(page: Page, x: number, y: number, width: number, height: number) {
  const box = expectDefined(await new CanvasHelper(page).canvas.boundingBox(), 'canvas bounds')
  await page.mouse.move(box.x + x, box.y + y)
  await page.mouse.down()
  await page.mouse.move(box.x + x + width, box.y + y + height / 2, { steps: 6 })
  await page.mouse.move(box.x + x + width, box.y + y + height, { steps: 6 })
  await page.mouse.up()
}

/**
 * The mock transport answers with text only and calls no tools, so it cannot resolve the thread
 * the way a real agent follows the prompt. What this proves is what travels: the marked area, its
 * crop as an attachment, and the chat's reply on that submission.
 */
test('Fix with agent sends a drawn thread with its marked area and crop', async ({
  page,
  configuredChat: chat
}) => {
  await chat.closeChat()
  const canvas = new CanvasHelper(page)
  await canvas.drawRect(100, 100, 200, 150)
  await page.getByTestId(toolbarToolTestId('COMMENT')).click()

  await ring(page, 80, 80, 240, 190)
  const composer = page.getByRole('textbox', { name: 'Add a comment' })
  await expect(composer).toBeFocused()
  await composer.fill('contrast is too low')
  await composer.press('Enter')
  await expect(regions(page)).toHaveCount(1)

  await pins(page).first().click({ button: 'right' })
  await page.getByRole('menu').locator('[data-command="comment-apply-with-ai"]').click()

  await expect(chat.chatColumn).toBeVisible()
  await expect(chat.userMessage()).toContainText('Apply the feedback in this comment thread')
  await expect(chat.userMessage()).toContainText('Marked area:')
  await expect(
    chat.userMessage().getByRole('button', { name: 'View attachment marked-area.png' })
  ).toBeVisible()
  await expect(chat.assistantMessage()).not.toBeEmpty()
})
