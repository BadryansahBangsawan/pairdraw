import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * A coding agent's model, reasoning effort, and mode, as the stand-in agent advertises them
 * through ACP session config options and modes. It runs through the companion, as the web app
 * runs agents; its replies name the session's settings once they leave the defaults.
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

function control(page: Page, category: 'model' | 'thought_level' | 'mode') {
  return page
    .getByTestId('chat-agent-session-control')
    .and(page.locator(`[data-category="${category}"]`))
}

test('the composer offers the agent’s model, reasoning, and mode, and keeps them for new chats', async ({
  page,
  baseURL
}) => {
  test.setTimeout(120_000)
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-session-controls-e2e-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  try {
    await connectClaudeCode(page, companion.link, companion.fingerprint)
    const chat = new ChatHarness(page)
    await chat.openChat()

    // The agent names its settings when its first session starts.
    await chat.submit('first')
    await expect(chat.assistantMessage()).toContainText('echo: first', { timeout: 60_000 })
    await expect(control(page, 'model')).toHaveAccessibleName('Model: Fake Fast')
    await expect(control(page, 'thought_level')).toHaveAccessibleName('Reasoning effort: Medium')
    await expect(control(page, 'mode')).toHaveAccessibleName('Mode: Ask before edits')

    // A choice applies to the running session.
    await control(page, 'model').click()
    await page.getByRole('option', { name: 'Fake Smart', exact: true }).click()
    await expect(control(page, 'model')).toHaveAccessibleName('Model: Fake Smart')
    await control(page, 'mode').click()
    await page.getByRole('option', { name: 'Auto', exact: true }).click()
    await chat.submit('second')
    // The fake agent echoes its settings in brackets, which the reply's Markdown drops.
    await expect(chat.assistantMessage()).toContainText('echo: second fake-smart, medium, auto')

    // A new chat starts a new session with the same choices.
    await page.getByRole('button', { name: 'New chat', exact: true }).click()
    await chat.submit('third')
    await expect(chat.assistantMessage()).toContainText('echo: third fake-smart, medium, auto', {
      timeout: 60_000
    })
  } finally {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})
