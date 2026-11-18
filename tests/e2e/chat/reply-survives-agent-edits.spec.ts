import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * A coding agent that opens a document of its own with `new_document` and keeps editing it by its
 * id keeps its reply running while the chat's own document is in front, and reaches its final text
 * without anything stopping it.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

async function connectClaudeCode(page: Page, link: string, fingerprint: string): Promise<void> {
  await page.goto(link)
  await new CanvasHelper(page).waitForInit()
  const pairing = page.getByRole('alertdialog')
  await expect(pairing).toContainText(fingerprint)
  await pairing.getByRole('button', { name: 'Connect' }).click()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-ai').click()
  await page.getByTestId('settings-add-model').click()
  const editor = page.getByTestId('settings-model-editor')
  await editor.locator('[data-provider="acp:claude-code"]').click()
  await editor.getByRole('button', { name: 'Connect Claude Code' }).click()
  await expect(page.getByRole('combobox', { name: 'Design agent' })).toContainText('Claude Code', {
    timeout: 60_000
  })
  await page.getByTestId('app-settings-done').click()
}

test('a coding agent editing a document it opened does not stop its own reply', async ({
  page,
  baseURL
}) => {
  test.setTimeout(180_000)
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-agent-stop-e2e-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  try {
    await connectClaudeCode(page, companion.link, companion.fingerprint)
    const chat = new ChatHarness(page)
    await chat.openChat()

    await chat.input.fill('design-in-new-document please')
    await chat.sendButton.click()
    await expect(chat.assistantMessage()).toContainText('opening a new document', {
      timeout: 60_000
    })

    // The agent's own document opened as a tab; the person goes back to their chat's document.
    await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
    await page.getByTestId('tabbar-tab').first().click()
    await expect(page.getByTestId('chat-run-location')).toHaveCount(0)
    await expect(page.getByTestId('chat-message-user')).toHaveCount(1)

    // While the agent keeps editing that document, the reply still runs, with nothing stopped.
    await expect(page.getByTestId('chat-stop-button')).toBeVisible()
    await expect(page.locator('[data-slot="chat-turn-stopped"]')).toHaveCount(0)

    // It reaches its final text on its own.
    await expect(chat.assistantMessage()).toContainText('finished the mockup', { timeout: 60_000 })
    await expect(page.getByTestId('chat-stop-button')).toHaveCount(0)
    await expect(page.locator('[data-slot="chat-turn-stopped"]')).toHaveCount(0)
  } finally {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})
