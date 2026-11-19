import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * A coding agent's shell command can fail after printing a whole file. That failure belongs to
 * the call, so the chat keeps it as a compact failed card: closed, a few lines of output, and the
 * line that failed, instead of a red block that floods the reply.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

test('a failed agent tool call with long output stays a compact card', async ({
  page,
  baseURL
}) => {
  test.setTimeout(180_000)
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-failed-tool-e2e-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  try {
    await page.goto(companion.link)
    await new CanvasHelper(page).waitForInit({ designPanel: false })
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(companion.fingerprint)
    await dialog.getByRole('button', { name: 'Connect' }).click()

    await page.getByTestId('app-settings-trigger').click()
    await page.getByTestId('settings-section-ai').click()
    await page.getByTestId('settings-add-model').click()
    const editor = page.getByTestId('settings-model-editor')
    await editor.locator('[data-provider="acp:claude-code"]').click()
    await editor.getByRole('button', { name: 'Connect Claude Code' }).click()
    await expect(page.getByRole('combobox', { name: 'Design agent' })).toContainText(
      'Claude Code',
      { timeout: 60_000 }
    )
    await page.getByTestId('app-settings-done').click()

    const chat = new ChatHarness(page)
    await chat.openChat()
    await chat.input.fill('fail-tool, read the README')
    await chat.sendButton.click()

    const card = page.locator('[data-slot="chat-tool-call"][data-tool-state="error"]')
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card).toHaveAttribute('data-state', 'closed')
    // The failed line is what the person needs, without opening the call.
    await expect(card).toContainText('not found')
    await expect(card.getByText('README line 400')).toBeHidden()

    // Opening the call keeps its output to a few lines until the person asks for all of it.
    await card.getByRole('button', { expanded: false }).click()
    await expect(card).toHaveAttribute('data-state', 'open')
    const errorText = card.locator('[data-slot="chat-tool-error-text"]')
    const errorLines = async () => ((await errorText.textContent()) ?? '').trim().split('\n').length
    await expect.poll(errorLines).toBe(8)
    await card.getByRole('button', { name: 'Show all' }).click()
    await expect.poll(errorLines).toBe(401)
  } finally {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})
