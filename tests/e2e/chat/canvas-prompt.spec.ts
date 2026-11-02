import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openChatEditor } from '#tests/helpers/chat/fixture'

// Other specs start with the prompt off, so it does not cover the canvas they draw on.
test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser test baseURL is required')
    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            {
              name: 'open-pencil:preferences:v1',
              value: JSON.stringify({
                version: 1,
                onboarding: { aiSetup: 'done' },
                chat: { canvasPrompt: true }
              })
            }
          ]
        }
      ]
    })
  }
})

const pageLayerCount = (page: Page) =>
  page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getNode(store.state.currentPageId)?.childIds.length ?? -1
  })

test('a prompt over an empty page goes into its chat, which opens', async ({ page }) => {
  const chat = await openChatEditor(page)
  await chat.configureOpenRouter('sk-or-test-key-12345')
  await chat.closeChat()

  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  await expect(offer).toBeVisible()
  const prompt = offer.getByRole('textbox', { name: 'Describe a design' })
  await prompt.fill('A landing page for a coffee shop')
  await prompt.press('Enter')

  await expect(offer).toBeHidden()
  await expect(chat.chatColumn).toBeVisible()
  await expect(chat.userMessage()).toHaveText('A landing page for a coffee shop')
  await expect(chat.assistantMessage()).not.toBeEmpty()
  // Once used, it does not come back to this document while its page stays empty.
  expect(await pageLayerCount(page)).toBe(0)
  await expect(offer).toBeHidden()
})

test('the canvas around the prompt still draws, and the first layer hides it', async ({ page }) => {
  await openChatEditor(page)
  const canvas = new CanvasHelper(page)
  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  await expect(offer).toBeVisible()

  // The top left corner of the canvas is outside the prompt's card.
  await canvas.drawRect(40, 40, 80, 60)
  expect(await pageLayerCount(page)).toBe(1)
  await expect(offer).toBeHidden()

  // An empty page offers it again; closing it keeps it away from the document.
  await canvas.undo()
  await expect(offer).toBeVisible()
  await offer.getByRole('button', { name: 'Hide prompt' }).click()
  await expect(offer).toBeHidden()
})

test('an example fills the prompt to read and edit, and sends nothing yet', async ({ page }) => {
  const chat = await openChatEditor(page)
  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  await expect(offer).toBeVisible()
  const prompt = offer.getByRole('textbox', { name: 'Describe a design' })

  await offer
    .getByRole('list', { name: 'Examples' })
    .getByRole('button', { name: 'Dashboard' })
    .click()
  await expect(prompt).toHaveValue(/dashboard/i)
  await expect(prompt).toBeFocused()
  await expect(offer).toBeVisible()
  await expect(chat.chatColumn).toBeHidden()
  await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
})
