import { spawn, type ChildProcess } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { expect, test } from '@playwright/test'
import * as v from 'valibot'

import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'
import { repoPath, testPath } from '#tests/helpers/paths'

/**
 * The web app with the companion, as a person runs it: `openpencil-connect` prints a link, the
 * tab opens it and pairs, and the chat runs Claude Code on this computer. A stand-in agent named
 * `claude-agent-acp` comes first on the companion's PATH.
 */
test.skip(process.platform === 'win32', 'The stand-in agent is a shell script')

const healthSchema = v.looseObject({ status: v.string() })

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

interface Companion {
  child: ChildProcess
  port: number
  link: string
  /** What the companion prints beside the link for the tab to show. */
  fingerprint: string
}

async function startCompanion(appURL: string, dir: string): Promise<Companion> {
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  const agent = join(bin, 'claude-agent-acp')
  // It answers as Claude's supported adapter does.
  const fixture = testPath('helpers/agents/acp-agent.ts')
  writeFileSync(agent, `#!/bin/sh\nexec bun "${fixture}" @agentclientprotocol/claude-agent-acp\n`)
  chmodSync(agent, 0o755)
  const port = await freePort()
  const child = spawn(process.execPath, [repoPath('packages/mcp/dist/connect.mjs'), '--no-open'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      PORT: String(port),
      OPENPENCIL_CONNECT_APP_URL: appURL,
      OPENPENCIL_MCP_SOCKET: join(dir, 'mcp.sock'),
      OPENPENCIL_MCP_DISCOVERY_PATH: join(dir, 'mcp.json'),
      OPENPENCIL_MCP_ROOT: dir
    }
  })
  const printed = await new Promise<{ link: string; fingerprint: string }>((resolve, reject) => {
    let output = ''
    child.once('exit', (code) => reject(new Error(`The companion exited (${code}): ${output}`)))
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
      const link = /(https?:\/\/\S+#connect=\S+)/.exec(output)?.[1]
      const fingerprint = /shows ([0-9A-F]{3}-[0-9A-F]{3})/.exec(output)?.[1]
      if (link && fingerprint) resolve({ link, fingerprint })
    })
  })
  return { child, port, ...printed }
}

test('a tab opened from the companion’s link pairs and chats with an agent on this computer', async ({
  page,
  baseURL
}) => {
  test.setTimeout(120_000)
  const dir = mkdtempSync(join(tmpdir(), 'op-companion-e2e-'))
  const companion = await startCompanion(new URL('/?test', baseURL).href, dir)
  try {
    await page.goto(companion.link)
    await new CanvasHelper(page).waitForInit()
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
