import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'
import { injectToolLoopTransport } from '#tests/helpers/chat/tool-loop'

const cardCount = (page: Page) =>
  page.evaluate(() => {
    const graph = window.openPencil?.getStore?.().graph
    return graph ? [...graph.nodes.values()].filter((node) => node.name === 'Card').length : -1
  })

async function askBeforeChanges(page: Page): Promise<void> {
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-ai').click()
  const toggle = page.getByRole('switch', { name: 'Ask before changes', exact: true })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('app-settings-done').click()
}

test('with approval on, the built-in chat asks before each change and respects the answer', async ({
  configuredChat: chat,
  page
}) => {
  await injectToolLoopTransport(page)
  await askBeforeChanges(page)

  // Allowed: the scripted model's render runs.
  await chat.submit('Add a card')
  const dialog = page.getByTestId('acp-permission-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('render')
  await dialog.getByRole('button', { name: 'Allow', exact: true }).click()
  await expect(chat.assistantMessage()).toContainText('Done')
  expect(await cardCount(page)).toBe(1)

  // Declined: nothing changes and the reply still ends.
  await chat.submit('Add another card')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Deny', exact: true }).click()
  await expect(page.getByTestId('chat-message-assistant')).toHaveCount(2)
  await expect(chat.assistantMessage()).toContainText('Done')
  expect(await cardCount(page)).toBe(1)

  // “Always allow” stops asking about that tool for the rest of the chat.
  await chat.submit('Add a third card')
  await dialog.getByRole('button', { name: 'Always allow render in this chat' }).click()
  await expect(page.getByTestId('chat-message-assistant')).toHaveCount(3)
  await expect(chat.assistantMessage()).toContainText('Done')
  await chat.submit('Add a fourth card')
  await expect(page.getByTestId('chat-message-assistant')).toHaveCount(4)
  await expect(chat.assistantMessage()).toContainText('Done')
  await expect(dialog).toBeHidden()
  expect(await cardCount(page)).toBe(3)
})

test('approval is off by default, so the chat edits without asking', async ({
  configuredChat: chat,
  page
}) => {
  await injectToolLoopTransport(page)
  await chat.submit('Add a card')
  await expect(chat.assistantMessage()).toContainText('Done')
  await expect(page.getByTestId('acp-permission-dialog')).toBeHidden()
  expect(await cardCount(page)).toBe(1)
})
