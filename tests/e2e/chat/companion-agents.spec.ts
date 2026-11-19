import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import * as v from 'valibot'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * The web app with the companion, as a person runs it: `pairdraw-connect` prints a link, the
 * tab opens it and pairs, and the chat runs Claude Code on this computer. A stand-in agent named
 * `claude-agent-acp` comes first on the companion's PATH.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

const healthSchema = v.looseObject({ status: v.string() })

test('a tab opened from the companion’s link pairs and chats with an agent on this computer', async ({
  page,
  baseURL
}) => {
  test.setTimeout(120_000)
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-companion-e2e-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  try {
    await page.goto(companion.link)
    await new CanvasHelper(page).waitForInit({ designPanel: false })
    // The one-time code leaves the address bar.
    await expect(page).not.toHaveURL(/connect=/)
    // Nothing pairs until the person confirms the characters the terminal printed.
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(companion.fingerprint)
    await dialog.getByRole('button', { name: 'Connect' }).click()

    // The app's bridge registers with the companion over its origin-checked socket.
    await expect
      .poll(async () => {
        const response = await fetch(`http://127.0.0.1:${companion.port}/health`)
        return v.parse(healthSchema, await response.json()).status
      })
      .toBe('ok')

    await page.getByTestId('app-settings-trigger').click()
    await page.getByTestId('settings-section-ai').click()
    await page.getByTestId('settings-add-model').click()
    const editor = page.getByTestId('settings-model-editor')
    await editor.locator('[data-provider="acp:claude-code"]').click()
    await expect(editor.getByText(/Connected to your computer/)).toBeVisible()
    await editor.getByRole('button', { name: 'Connect Claude Code' }).click()
    // Connecting ends by saving the agent as the design agent.
    await expect(page.getByRole('combobox', { name: 'Design agent' })).toContainText(
      'Claude Code',
      { timeout: 60_000 }
    )
    await page.getByTestId('app-settings-done').click()

    const chat = new ChatHarness(page)
    await chat.openChat()
    await chat.input.fill('hello from the browser')
    await chat.sendButton.click()
    await expect(chat.assistantMessage()).toContainText('echo: hello from the browser', {
      timeout: 60_000
    })
  } finally {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})
