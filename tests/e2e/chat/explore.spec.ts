import type { Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'

const lastRequest = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.lastChatRequest ?? '')

test('Let it cook asks each message for variants until it is turned off', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  const picker = page.getByTestId('chat-explore-picker')
  await expect(picker).toHaveAttribute('data-state', 'off')

  await picker.click()
  const popover = page.getByRole('dialog', { name: 'Let it cook' })
  await popover.getByRole('button', { name: 'Variants' }).click()
  await popover.getByRole('button', { name: '4' }).click()
  await popover.getByRole('button', { name: 'Style' }).click()
  await page.keyboard.press('Escape')
  await expect(picker).toHaveAttribute('data-state', 'on')

  await chat.input.click()
  await page.keyboard.type('a pricing card')
  await page.keyboard.press('Enter')
  // The transcript shows what was typed; the model reads how to explore it.
  await expect(chat.userMessage()).toContainText('a pricing card')
  await expect(chat.userMessage()).not.toContainText('<explore')
  expect(await lastRequest(page)).toContain('<explore mode="variants" count="4" axis="style"')
  await expect(chat.assistantMessage()).not.toBeEmpty()

  await picker.click()
  await popover.getByRole('button', { name: 'Off' }).click()
  await page.keyboard.press('Escape')
  await chat.input.click()
  await page.keyboard.type('a footer')
  await page.keyboard.press('Enter')
  await expect(chat.userMessage()).toContainText('a footer')
  expect(await lastRequest(page)).not.toContain('<explore')
})

test("Don't iterate asks for one design in a single pass", async ({ configuredChat: chat }) => {
  const { page } = chat
  await page.getByTestId('chat-explore-picker').click()
  await page
    .getByRole('dialog', { name: 'Let it cook' })
    .getByRole('button', { name: "Don't iterate" })
    .click()
  await page.keyboard.press('Escape')

  await chat.input.click()
  await page.keyboard.type('a login screen')
  await page.keyboard.press('Enter')
  await expect(chat.userMessage()).toContainText('a login screen')
  expect(await lastRequest(page)).toContain('<explore mode="single"')
})

test('notes for AI on a layer reach requests about it, and its prompt runs in the chat', async ({
  page,
  configuredChat: chat
}) => {
  await chat.closeChat()
  await new CanvasHelper(page).drawRect(200, 200, 160, 80)

  const section = page.getByTestId('agent-notes-section')
  await section.getByRole('button', { name: 'Add notes for AI' }).click()
  await section.getByLabel('Context').fill('Opens the sign-up dialog')
  await section.getByLabel('Prompt').fill('Make it the primary call to action')
  // Leaving a field commits it.
  await section.getByLabel('Context').click()

  await section.getByRole('button', { name: 'Run prompt' }).click()
  await expect(chat.chatColumn).toBeVisible()
  await expect(chat.userMessage()).toContainText('Make it the primary call to action')
  await expect(chat.userMessage().locator('[data-slot="chat-reference"]')).toHaveCount(1)
  const request = await lastRequest(page)
  expect(request).toContain('<layer-note')
  expect(request).toContain('Opens the sign-up dialog')

  // The notes are one undo step on the layer, as any other edit.
  await chat.closeChat()
  await section.getByRole('button', { name: 'Remove notes for AI' }).click()
  await expect(section.getByLabel('Context')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(section.getByLabel('Context')).toHaveValue('Opens the sign-up dialog')
})
