import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'

/** The mock streams two lines, then waits for this event before it finishes the reply. */
async function finishPausedReply(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('mock-chat-continue')))
}

/** A request through the MCP bridge, as a coding agent's call arrives while a reply streams. */
async function automation(page: Page, command: string, args: Record<string, unknown> = {}) {
  await page.evaluate(
    async ({ command, args }) => {
      const request = window.pairdraw?.test?.automation
      if (!request) throw new Error('Automation test hook is not installed')
      await request(command, args)
    },
    { command, args }
  )
}

const stoppedMarker = '[data-slot="chat-turn-stopped"]'
const readOnly =
  'This agent transcript is saved, but its session cannot be resumed here yet. Start a new chat to continue working.'

test('a reply keeps running when an agent opens a document, and resumes on the first one', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  const tabs = page.getByTestId('tabbar-tab')
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await automation(page, 'new_document')
  await expect(tabs).toHaveCount(2)
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
  await expect(page.getByTestId('chat-run-location')).toContainText('is working in')
  await expect(page.getByTestId('chat-stop-button')).toBeVisible()

  await finishPausedReply(page)
  await tabs.first().click()
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
  await expect(page.getByText(readOnly)).toHaveCount(0)
  await expect(chat.input).toBeEnabled()

  await chat.submit('Hello there')
  await expect(chat.assistantMessage()).toContainText('Hello there')
  await expect(page.getByTestId('chat-message-user')).toHaveCount(2)
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
})

test('“Go to document” returns to the document whose reply runs', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  const tabs = page.getByTestId('tabbar-tab')
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await automation(page, 'new_document')
  await expect(tabs).toHaveCount(2)
  await expect(tabs.nth(1)).toHaveAttribute('data-active', '')

  await page.getByRole('button', { name: 'Go to document' }).click()
  await expect(tabs.first()).toHaveAttribute('data-active', '')
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
  await expect(page.getByTestId('chat-stop-button')).toBeVisible()
  await expect(chat.userMessage()).toContainText('paused short stream')

  await finishPausedReply(page)
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
})

test('Save As of the running document keeps its reply in front', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  await page.evaluate(() => {
    const writable: Pick<FileSystemWritableFileStream, 'write' | 'close'> = {
      write: async () => undefined,
      close: async () => undefined
    }
    const handle = {
      name: 'Renamed.fig',
      getFile: async () => new File([], 'Renamed.fig'),
      createWritable: async () => writable
    }
    window.showSaveFilePicker = async () => handle as FileSystemFileHandle
  })

  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await page.keyboard.press('Meta+Shift+s')
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
  await expect(page.getByTestId('chat-stop-button')).toBeVisible()
  await expect(page.locator(stoppedMarker)).toHaveCount(0)

  await finishPausedReply(page)
  await expect(page.getByTestId('chat-stop-button')).toHaveCount(0)
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
  await expect(chat.assistantMessage()).toContainText('Line 3')
})

test('switching tabs and coming back keeps the reply streaming', async ({
  configuredChat: chat
}) => {
  const { page } = chat
  const tabs = page.getByTestId('tabbar-tab')
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await automation(page, 'new_document')
  await expect(tabs).toHaveCount(2)
  await tabs.first().click()
  await expect(page.getByTestId('chat-stop-button')).toBeVisible()
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)

  await finishPausedReply(page)
  await expect(chat.assistantMessage()).toContainText('Line 3')
  await expect(page.locator(stoppedMarker)).toHaveCount(0)
})

test('Stop while another document shows ends the reply', async ({ configuredChat: chat }) => {
  const { page } = chat
  const tabs = page.getByTestId('tabbar-tab')
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await automation(page, 'new_document')
  await expect(tabs).toHaveCount(2)
  await expect(page.getByTestId('chat-stop-button')).toBeVisible()
  await page.getByTestId('chat-stop-button').click()
  // The reply ends, so nothing runs anywhere, and the panel hands itself back to the document in
  // front: the stopped transcript belongs to the document that started the reply.
  await expect(page.getByTestId('chat-stop-button')).toHaveCount(0)
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
  await expect(page.getByTestId('chat-message-user')).toHaveCount(0)

  await tabs.first().click()
  await expect(chat.assistantMessage()).toContainText('Line 1')
  await expect(page.locator(stoppedMarker)).toBeVisible()
})

test('New chat while another document shows ends the reply', async ({ configuredChat: chat }) => {
  const { page } = chat
  await chat.submit('paused short stream')
  await expect(chat.assistantMessage()).toContainText('Line 1')

  await automation(page, 'new_document')
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  await page.getByRole('button', { name: 'New chat' }).click()
  await expect(page.getByTestId('chat-stop-button')).toHaveCount(0)
  await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
  await expect(page.getByTestId('chat-message-user')).toHaveCount(0)
  await expect(page.getByTestId('chat-send-button')).toBeVisible()
})
