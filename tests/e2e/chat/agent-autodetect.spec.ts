import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import {
  startCompanion,
  systemAgentPrograms,
  type Companion,
  type CompanionOptions
} from '#tests/helpers/agents/companion'
import { ChatHarness } from '#tests/helpers/chat/harness'

/**
 * A fresh web app paired with a companion of its own, which looks for coding agents on that
 * computer: with no AI model set up, a prompt on Home uses the one it finds instead of asking
 * for setup. The companion's PATH and home hold only Node, Bun, and, where a test wants one, a
 * stand-in `claude-agent-acp`, so the agents the machine running the test installed stay out.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

const companions: { companion: Companion; dir: string }[] = []
test.afterEach(() => {
  for (const { companion, dir } of companions.splice(0)) {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
})

/** Opens Home from the companion's link and confirms the pairing, as a person does. */
async function openPaired(page: Page, baseURL: string | undefined, options: CompanionOptions) {
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-autodetect-e2e-'))
  const companion = await startCompanion(new URL('/', baseURL).href, dir, {
    isolated: true,
    ...options
  })
  companions.push({ companion, dir })
  await page.goto(companion.link)
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText(companion.fingerprint)
  await dialog.getByRole('button', { name: 'Connect' }).click()
  await expect(dialog).toBeHidden()
  const home = page.getByTestId('recent-files-home')
  await expect(home).toBeVisible()
  return { home, prompt: home.getByRole('textbox', { name: 'Describe a design' }) }
}

test('a prompt on Home runs the coding agent on this computer without setup', async ({
  page,
  baseURL
}) => {
  test.setTimeout(120_000)
  const { prompt } = await openPaired(page, baseURL, { agent: true })
  // "Something else" sends the words alone, which is what the echoing agent answers with.
  await page.getByRole('button', { name: 'Something else…' }).click()
  await prompt.fill('A pricing page with three plans')
  await prompt.press('Enter')

  const chat = new ChatHarness(page)
  await expect(chat.chatColumn).toBeVisible({ timeout: 60_000 })
  await expect(chat.assistantMessage()).toContainText('echo: A pricing page with three plans', {
    timeout: 60_000
  })
  await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
  await expect(chat.profileTrigger).toContainText('Claude Code')

  // The chat names the agent it switched to, and changing it opens the model picker.
  const notice = chat.chatColumn.getByRole('status').filter({ hasText: 'Claude Code' })
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
})

test('without an agent on this computer, a prompt on Home opens guided setup and keeps the prompt', async ({
  page,
  baseURL
}) => {
  test.skip(
    systemAgentPrograms().length > 0,
    'The companion finds the agents installed in system folders, which a test cannot hide'
  )
  test.setTimeout(60_000)
  const { home, prompt } = await openPaired(page, baseURL, { agent: false })
  await prompt.fill('A sign-in screen')
  await prompt.press('Enter')

  const setup = page.getByTestId('ai-setup-dialog')
  await expect(setup).toBeVisible({ timeout: 30_000 })
  await page.keyboard.press('Escape')
  await expect(setup).toBeHidden()
  await expect(home).toBeVisible()
  await expect(prompt).toHaveValue('A sign-in screen')
})
