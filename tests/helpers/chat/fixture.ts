import { test as base, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { routeModelCatalog } from '#tests/helpers/chat/catalog'
import { ChatHarness } from '#tests/helpers/chat/harness'
import { injectMockChatTransport } from '#tests/helpers/chat/transport'
import { routeVisionModel } from '#tests/helpers/chat/vision'
import { openDesignPanel } from '#tests/helpers/properties'

interface ChatFixtures {
  chat: ChatHarness
  configuredChat: ChatHarness
}

export const test = base.extend<ChatFixtures>({
  chat: async ({ page }, use) => {
    await routeModelCatalog(page)
    await routeVisionModel(page)
    const harness = new ChatHarness(page)
    await harness.open()
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await openDesignPanel(page)
    await injectMockChatTransport(page)
    await use(harness)
  },
  configuredChat: async ({ chat }, use) => {
    await chat.configureOpenRouter('sk-or-test-key-12345')
    await use(chat)
  }
})

/**
 * The editor of a fresh test document, with the chat's model catalog and transport mocked as the
 * `chat` fixture mocks them, for specs that also visit Home or set their own preferences.
 */
export async function openChatEditor(page: Page): Promise<ChatHarness> {
  await routeModelCatalog(page)
  await routeVisionModel(page)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openDesignPanel(page)
  await injectMockChatTransport(page)
  return new ChatHarness(page)
}

export { expect }
