import { expect, test } from '@playwright/test'

import { askFor, chatWithAgent } from '#tests/helpers/agents/chat'

/**
 * Seam: the chat's own coding agent starts a document while the person watches that chat.
 * Catches a document that lands in a tab nobody was brought to.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

test('a document the chat’s agent creates opens in front and keeps the running reply', async ({
  page,
  baseURL
}) => {
  test.setTimeout(180_000)
  const { chat, stop } = await chatWithAgent(page, baseURL)
  try {
    const tabs = page.getByTestId('tabbar-tab')
    await chat.submit(
      `Start a document for the profile.\n${askFor({ name: 'new_document' })}\nstay-quiet`
    )

    // The document the reply created is the one in front, so the person watches it being made.
    await expect(tabs).toHaveCount(2, { timeout: 60_000 })
    await expect(tabs.nth(1)).toHaveAttribute('data-active', '')
    // The panel still shows the reply that created it, with its Stop, rather than a new chat.
    await expect(chat.assistantMessage()).toContainText('working on it')
    await expect(page.getByTestId('chat-stop-button')).toBeVisible()

    await page.getByTestId('chat-stop-button').click()
    await expect(page.getByTestId('chat-stop-button')).toBeHidden()
  } finally {
    stop()
  }
})
