import { test, expect } from '#tests/helpers/chat/fixture'

test('chat transcript has a live region that announces streamed assistant replies', async ({
  configuredChat: chat,
  page
}) => {
  test.setTimeout(120000)
  await chat.openChat()

  // Send a normal message that completes (not paused)
  await chat.input.fill('Hello, please respond')
  await chat.input.press('Enter')
  await expect(chat.assistantMessage()).not.toBeEmpty()

  // Wait for the stream to finish (aria-busy becomes false)
  await expect(page.locator('[role="log"][aria-live="polite"]')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 30000 }
  )

  // Check the live region exists in the transcript
  const liveRegion = page.locator('[role="log"][aria-live="polite"]')
  await expect(liveRegion).toHaveCount(1)

  // Check it has aria-busy attribute (now false)
  await expect(liveRegion).toHaveAttribute('aria-busy', 'false')

  // Check chat-messages is inside it
  const messages = liveRegion.getByTestId('chat-messages')
  await expect(messages).toHaveCount(1)
})
