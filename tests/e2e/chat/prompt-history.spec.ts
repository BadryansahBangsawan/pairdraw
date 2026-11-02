import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'
import type { ChatHarness } from '#tests/helpers/chat/harness'

/** Sends `text` and waits for the mock's reply to it, so the next prompt goes in a new turn. */
async function sendAndWait(chat: ChatHarness, text: string) {
  const replies = chat.page.getByTestId('chat-message-assistant')
  const before = await replies.count()
  await chat.submit(text)
  await expect(replies).toHaveCount(before + 1)
  await expect(chat.sendButton).toBeDisabled()
}

async function finishPausedReply(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('mock-chat-continue')))
}

test('Up and Down step through the prompts sent in the conversation', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  await sendAndWait(chat, 'Draw a card')
  await sendAndWait(chat, 'Make it blue')

  await chat.input.click()
  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('Make it blue')
  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('Draw a card')
  await page.keyboard.press('ArrowDown')
  await expect(chat.input).toHaveText('Make it blue')
  await page.keyboard.press('ArrowDown')
  // Past the latest prompt the field is empty again.
  await expect(chat.input).not.toContainText('Make it blue')
  await expect(chat.sendButton).toBeDisabled()
})

test('a recalled prompt can be edited and sent', async ({ configuredChat: chat }) => {
  const { page } = chat
  await sendAndWait(chat, 'Draw a card')

  await chat.input.click()
  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('Draw a card')
  await page.keyboard.press('End')
  await page.keyboard.type(' with a shadow')
  // Once edited, Up moves the caret instead of replacing the edit.
  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('Draw a card with a shadow')
  await page.keyboard.press('Enter')
  await expect(chat.userMessage()).toHaveText('Draw a card with a shadow')
})

test('Up over a draft leaves it in place', async ({ configuredChat: chat }) => {
  const { page } = chat
  await sendAndWait(chat, 'Draw a card')

  await chat.input.click()
  await page.keyboard.type('A new idea')
  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('A new idea')
})

test('waiting messages come back before earlier prompts', async ({ configuredChat: chat }) => {
  const { page } = chat
  await sendAndWait(chat, 'Draw a card')
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')
  await chat.input.click()
  await page.keyboard.type('Make it blue')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('chat-queued-message')).toHaveCount(1)

  await page.keyboard.press('ArrowUp')
  await expect(chat.input).toHaveText('Make it blue')
  await expect(page.getByTestId('chat-queued-message')).toHaveCount(0)
  await finishPausedReply(page)
})
