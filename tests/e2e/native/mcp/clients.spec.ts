import { strict as assert } from 'node:assert'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

import { invokeNative } from '#tests/helpers/tauri/invoke'

const CLIENTS = [
  'claude-code',
  'claude-desktop',
  'codex',
  'gemini-cli',
  'opencode',
  'kiro',
  'cursor',
  'vs-code'
] as const

const configSchema = v.object({
  displayPath: v.string(),
  installed: v.boolean(),
  content: v.nullable(v.string())
})

/** The person's real Cursor config, which this spec only ever reads. */
const CURSOR_CONFIG = join(homedir(), '.cursor', 'mcp.json')

function fileState(path: string): string {
  return existsSync(path) ? `${statSync(path).mtimeMs}:${readFileSync(path, 'utf8')}` : 'missing'
}

/** The command's rejection, as the webview receives it. */
async function rejection(command: string, args: Record<string, unknown>): Promise<string> {
  return invokeNative(command, args).then(() => 'resolved', String)
}

describe('MCP client config commands', () => {
  // These run against the account's real home folder, so nothing here may write: reads are
  // checked, and writes are only ever sent with text the file does not hold, which the shell
  // refuses before touching anything.

  it('reads every client by name and shows where its file is', async () => {
    for (const client of CLIENTS) {
      const config = v.parse(
        configSchema,
        await invokeNative<unknown>('mcp_client_config_read', { client })
      )
      assert.ok(config.displayPath.length > 0, `${client} has no file`)
      // These have no environment override, so their files are always in the home folder.
      if (client === 'cursor' || client === 'gemini-cli' || client === 'kiro') {
        assert.match(config.displayPath, /^~[/\\]/, `${client} resolved outside the home folder`)
      }
    }
  })

  it('refuses a client it does not know', async () => {
    assert.notEqual(
      await rejection('mcp_client_config_read', { client: '../../.ssh/config' }),
      'resolved'
    )
  })

  it('writes only over the text the edit started from', async () => {
    const before = fileState(CURSOR_CONFIG)
    const error = await rejection('mcp_client_config_write', {
      client: 'cursor',
      enabled: false,
      content: '{}',
      expected: '{"not": "the file"}'
    })
    assert.match(error, /changed|not-installed/)
    assert.equal(fileState(CURSOR_CONFIG), before)
  })

  it('keeps client configs out of the fs plugin scope', async function () {
    // The scope is checked before the file is opened; opening without truncating or creating
    // changes nothing even if the scope let it through.
    if (!existsSync(CURSOR_CONFIG)) this.skip()
    const opened = await invokeNative<number>('plugin:fs|open', {
      path: CURSOR_CONFIG,
      options: { write: true }
    }).then((rid) => rid, String)
    if (typeof opened === 'number') await invokeNative('plugin:resources|close', { rid: opened })
    assert.match(String(opened), /forbidden|not allowed/i, `${CURSOR_CONFIG} opened for writing`)
  })
})
