import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * A coding agent that thinks or runs a command silently for minutes keeps the turn running: the
 * chat says the agent has gone quiet, with the agent's name and its Stop button, instead of
 * leaving the person to wonder. `?quiet-turn-ms` shortens the three minutes the app waits.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

test('a coding agent that goes quiet says so and can be stopped', async ({ page, baseURL }) => {
  test.setTimeout(180_000)
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-quiet-e2e-'))
  const companion = await startCompanion(new URL('/?test&quiet-turn-ms=2000', baseURL).href, dir)
  try {
    await page.goto(companion.link)
    await new CanvasHelper(page).waitForInit()
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
    await chat.input.fill('stay-quiet while I wait')
    await chat.sendButton.click()

    const notice = page.getByTestId('chat-quiet-notice')
    await expect(notice).toBeVisible({ timeout: 30_000 })
    await expect(notice).toHaveCount(1)
    await expect(notice).toContainText('Claude Code')

    await notice.getByRole('button', { name: 'Stop generating' }).click()
    await expect(notice).toHaveCount(0)
    await expect(page.getByTestId('chat-stop-button')).toBeHidden()
  } finally {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})
