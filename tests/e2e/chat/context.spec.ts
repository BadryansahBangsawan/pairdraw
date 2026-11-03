import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'
import { injectMockChatTransport } from '#tests/helpers/chat/transport'

const PILOT = 'tests/fixtures/vectorize/pilot_avatar.png'

/** The text the mock transport last received, notes for the model included. */
function lastRequest(page: Page) {
  return page.locator('html').getAttribute('data-last-chat-request')
}

test('the context meter shows how full the model’s context is, in tokens', async ({
  configuredChat: chat,
  page
}) => {
  await page.evaluate(() => {
    const setTransport = window.openPencil?.setChatTransport
    if (!setTransport) throw new Error('Transport override unavailable')
    setTransport(() => ({
      async sendMessages() {
        return new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'start', messageId: 'context-reply' })
            controller.enqueue({ type: 'text-start', id: 'text' })
            controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Done.' })
            controller.enqueue({ type: 'text-end', id: 'text' })
            controller.enqueue({
              type: 'message-metadata',
              messageMetadata: {
                context: { usedTokens: 150_000, windowTokens: 200_000, outputTokens: 900 }
              }
            })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          }
        })
      },
      async reconnectToStream() {
        return null
      }
    }))
  })
  try {
    await chat.submit('Draw a pricing table')
    const meter = page.getByTestId('chat-context-meter')
    await expect(meter).toHaveAccessibleName('Context window, 75% used')
    await meter.click()
    const details = page.getByTestId('chat-context-meter-details')
    await expect(details).toContainText('150K of 200K tokens')
    await expect(details).not.toContainText('$')
  } finally {
    await injectMockChatTransport(page)
  }
})

test('a pinned style kit goes with the next message once, and stays with the chat', async ({
  configuredChat: chat,
  page
}) => {
  await page.getByTestId('chat-pins-trigger').click()
  await page.getByTestId('chat-pins-add-style-kit').click()
  const dialog = page.getByTestId('chat-style-kit-dialog')
  await dialog.getByTestId('chat-style-kit-name').fill('Brand')
  await dialog.getByTestId('chat-style-kit-color').fill('#ff5b2e')
  await dialog.getByTestId('chat-style-kit-color').press('Enter')
  await dialog.getByTestId('chat-style-kit-fonts').fill('Fraunces, Inter')
  await dialog.getByTestId('chat-style-kit-save').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('chat-pins-trigger')).toContainText('1')

  await chat.submit('Draw a hero')
  await expect.poll(() => lastRequest(page)).toContain('<style-kit name="Brand">')
  await expect.poll(() => lastRequest(page)).toContain('#FF5B2E')
  // The transcript shows only what was written.
  await expect(chat.userMessage()).not.toContainText('style-kit')

  await chat.submit('Now a footer')
  await expect.poll(() => lastRequest(page)).toContain('Now a footer')
  expect(await lastRequest(page)).not.toContain('style-kit')

  // A new chat starts with nothing pinned; reopening this one brings its kit back.
  await page.getByRole('button', { name: 'New chat', exact: true }).first().click()
  await expect(page.getByTestId('chat-pins-trigger')).not.toContainText('1')
  await page.getByRole('button', { name: 'Conversation history', exact: true }).click()
  await page.getByRole('button', { name: 'Draw a hero', exact: true }).click()
  await page.getByTestId('chat-pins-trigger').click()
  await expect(page.getByTestId('chat-pinned-style-kit')).toContainText('Brand')
})

test('a pinned reference image is described once and goes with the next message', async ({
  configuredChat: chat,
  page
}) => {
  await page.getByTestId('chat-pins-trigger').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('chat-pins-add-images').click()
  await (await chooser).setFiles(PILOT)
  await expect(page.getByTestId('chat-pinned-reference')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Unpin pilot_avatar.png' })).toBeVisible()
  await page.keyboard.press('Escape')

  await chat.submit('Make the header match')
  await expect.poll(() => lastRequest(page)).toContain('<reference-image name="pilot_avatar.png">')
  await expect.poll(() => lastRequest(page)).toContain('A centered portrait on a light background.')
})
