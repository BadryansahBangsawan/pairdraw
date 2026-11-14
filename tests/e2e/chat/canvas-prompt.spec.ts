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
              name: 'pairdraw:preferences:v1',
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
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return store.graph.getNode(store.state.currentPageId)?.childIds.length ?? -1
  })

test('a prompt on the canvas goes into the chat, which opens in its place', async ({ page }) => {
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
  // The canvas carries it again once the chat column closes, with nothing left in its field.
  await chat.closeChat()
  await expect(offer).toBeVisible()
  await expect(prompt).toHaveValue('')
})

test('the canvas around the prompt still draws, and the first layer takes the examples away', async ({
  page
}) => {
  await openChatEditor(page)
  const canvas = new CanvasHelper(page)
  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  const examples = page.getByRole('list', { name: 'Examples' })
  await expect(offer).toBeVisible()
  await expect(examples).toBeVisible()

  // Clear of the toolbar at the canvas's left and of the prompt at its bottom.
  await canvas.drawRect(200, 100, 80, 60)
  expect(await pageLayerCount(page)).toBe(1)
  await expect(offer).toBeVisible()
  await expect(examples).toBeHidden()

  // An empty page suggests what to ask for again; closing the prompt keeps it away from the document.
  await canvas.undo()
  await expect(examples).toBeVisible()
  await offer.getByRole('button', { name: 'Hide prompt' }).click()
  await expect(offer).toBeHidden()
  await expect(examples).toBeHidden()
})

test('an example fills the prompt to read and edit, and sends nothing yet', async ({ page }) => {
  const chat = await openChatEditor(page)
  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  await expect(offer).toBeVisible()
  const prompt = offer.getByRole('textbox', { name: 'Describe a design' })

  await page
    .getByRole('list', { name: 'Examples' })
    .getByRole('button', { name: 'Dashboard' })
    .click()
  await expect(prompt).toHaveValue(/dashboard/i)
  await expect(prompt).toBeFocused()
  await expect(offer).toBeVisible()
  await expect(chat.chatColumn).toBeHidden()
  await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
})

test('Escape leaves the prompt for the canvas, whose shortcuts work again', async ({ page }) => {
  await openChatEditor(page)
  const offer = page.getByRole('region', { name: 'Start with a prompt' })
  await expect(offer).toBeVisible()
  const prompt = offer.getByRole('textbox', { name: 'Describe a design' })
  await prompt.fill('A pricing page')
  await expect(prompt).toBeFocused()

  await prompt.press('Escape')
  await expect(prompt).not.toBeFocused()
  await expect(page.getByTestId('canvas-element')).toBeFocused()
  await expect(prompt).toHaveValue('A pricing page')

  // R picks the Rectangle tool only from the canvas, not while typing.
  await page.keyboard.press('r')
  await expect
    .poll(() => page.evaluate(() => window.pairdraw?.getStore?.()?.state.activeTool))
    .toBe('RECTANGLE')
})
