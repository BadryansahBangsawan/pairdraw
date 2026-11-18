import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, type Page } from '@playwright/test'
import * as v from 'valibot'

import { startCompanion } from '#tests/helpers/agents/companion'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

/** A prompt asking the stand-in agent to call these Pairdraw tools before it replies. */
export function askFor(
  ...calls: { name: string; arguments?: Record<string, unknown> }[]
): string {
  return calls.map((call) => `<pairdraw-tool>${JSON.stringify(call)}</pairdraw-tool>`).join('\n')
}

export interface AgentChat {
  chat: ChatHarness
  stop: () => void
}

/** The web app paired with a companion running the stand-in agent, as the settings connect it. */
export async function chatWithAgent(
  page: Page,
  baseURL: string | undefined
): Promise<AgentChat> {
  const dir = mkdtempSync(join(tmpdir(), 'pairdraw-agent-document-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  const stop = () => {
    companion.child.kill('SIGINT')
    rmSync(dir, { recursive: true, force: true })
  }
  try {
    await page.goto(companion.link)
    await new CanvasHelper(page).waitForInit()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText(companion.fingerprint)
    await dialog.getByRole('button', { name: 'Connect' }).click()

    await page.getByTestId('app-settings-trigger').click()
    await page.getByTestId('settings-section-ai').click()
    // Edits animate in the shipped app, and the tests' profile turns that off for snapshots.
    await page.getByTestId('settings-ai-animate-edits').click()
    await expect(page.getByTestId('settings-ai-animate-edits')).toHaveAttribute(
      'aria-checked',
      'true'
    )
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
    return { chat, stop }
  } catch (error) {
    stop()
    throw error
  }
}

/** The documents the app has open, as an outside reader lists them. */
const listedSchema = v.object({
  result: v.object({
    documents: v.array(v.object({ id: v.string(), name: v.string(), active: v.boolean() }))
  })
})

export async function openDocuments(page: Page) {
  const listed = await page.evaluate(async () => {
    const request = window.pairdraw?.test?.automation
    if (!request) throw new Error('Automation test hook is not installed')
    return request('list_documents', {})
  })
  const parsed = v.safeParse(listedSchema, listed)
  if (!parsed.success) throw new Error('list_documents returned an unexpected shape')
  return parsed.output.result.documents
}
