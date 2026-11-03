import { describe, expect, test } from 'bun:test'

import dedent from 'dedent'

import { MCP_CLIENTS } from '@/app/automation/mcp/clients/catalog'
import type { MCPClient, MCPClientID } from '@/app/automation/mcp/clients/catalog'
import { editEntry, inspectEntry } from '@/app/automation/mcp/clients/entry'
import { parseJSONTree, treeValue } from '@/app/automation/mcp/clients/json/tree'

function client(id: MCPClientID): MCPClient {
  const found = MCP_CLIENTS.find((item) => item.id === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}

function edited(id: MCPClientID, text: string | null, enabled: boolean): string {
  const result = editEntry(client(id), text, enabled)
  if (!result.ok) throw new Error(result.reason)
  return result.text
}

function valueOf(text: string): unknown {
  const tree = parseJSONTree(text)
  return tree ? treeValue(tree) : undefined
}

describe('JSON clients', () => {
  test('turning on adds only the entry and turning off restores the file', () => {
    const original = dedent`
      {
        // Claude Code state
        "numStartups": 12,
        "mcpServers": {
          "github": { "type": "http", "url": "https://example.test/mcp" }
        },
        "projects": { "/work": { "allowedTools": [] } }
      }
    `
    const on = edited('claude-code', original, true)
    expect(inspectEntry(client('claude-code'), on)).toBe('added')
    expect(on).toContain('// Claude Code state')
    expect(valueOf(on)).toMatchObject({
      numStartups: 12,
      mcpServers: { github: { type: 'http', url: 'https://example.test/mcp' } },
      projects: { '/work': { allowedTools: [] } }
    })
    expect(edited('claude-code', on, false)).toBe(original)
  })

  test('each client keeps its servers under its own key', () => {
    for (const { id, key } of [
      { id: 'vs-code', key: 'servers' },
      { id: 'opencode', key: 'mcp' },
      { id: 'cursor', key: 'mcpServers' }
    ] as const) {
      const text = edited(id, null, true)
      expect(Object.keys(valueOf(text) as object)).toEqual([key])
      expect(inspectEntry(client(id), text)).toBe('added')
    }
  })

  test('an entry that starts another command stays on and is removed when turned off', () => {
    const text = '{"mcpServers": {"open-pencil": {"command": "bun", "args": ["stdio.ts"]}}}'
    expect(inspectEntry(client('cursor'), text)).toBe('custom')
    expect(edited('cursor', text, true)).toBe(text)
    expect(inspectEntry(client('cursor'), edited('cursor', text, false))).toBe('absent')
  })

  test('a missing or empty file has no entry, and turning it off changes nothing', () => {
    expect(inspectEntry(client('gemini-cli'), null)).toBe('absent')
    expect(inspectEntry(client('gemini-cli'), '')).toBe('absent')
    expect(edited('gemini-cli', null, false)).toBe('')
  })

  test('a broken file is reported and never rewritten', () => {
    for (const text of ['{"mcpServers": ', '[]', '{"mcpServers": "x"}']) {
      expect(inspectEntry(client('kiro'), text)).toBe('invalid')
      expect(editEntry(client('kiro'), text, true)).toEqual({ ok: false, reason: 'invalid' })
    }
  })
})

describe('Codex config.toml', () => {
  const codex = client('codex')
  const original = `${dedent`
    model = "gpt-5"  # default model

    [mcp_servers.github]
    command = "github-mcp"
    args = ["--read-only"]

    # profiles below
    [profiles.fast]
    model = "gpt-5-mini"
  `}\n`

  test('turning on appends a table and turning off restores the file', () => {
    const on = edited('codex', original, true)
    expect(inspectEntry(codex, on)).toBe('added')
    expect(on.startsWith(original)).toBe(true)
    expect(edited('codex', on, false)).toBe(original)
  })

  test('removes the table and its sub-tables but keeps comments of the next table', () => {
    const text = dedent`
      [mcp_servers."open-pencil"]
      command = "openpencil-mcp"

      [mcp_servers.open-pencil.env]
      A = "1"

      # profiles below
      [profiles.fast]
      model = "x"
    `
    expect(inspectEntry(codex, text)).toBe('added')
    expect(edited('codex', text, false)).toBe('# profiles below\n[profiles.fast]\nmodel = "x"')
  })

  test('ignores headers inside multi-line strings', () => {
    const text = 'notes = """\n[mcp_servers.open-pencil]\n"""\n'
    expect(inspectEntry(codex, text)).toBe('absent')
  })

  test('reports an entry it does not rewrite and refuses to change it', () => {
    for (const text of [
      'mcp_servers = { open-pencil = { command = "x" } }\n',
      '[mcp_servers]\nopen-pencil = { command = "x" }\n',
      'mcp_servers.open-pencil.command = "x"\n'
    ]) {
      expect(inspectEntry(codex, text)).toBe('manual')
      expect(editEntry(codex, text, false)).toEqual({ ok: false, reason: 'manual' })
    }
    expect(editEntry(codex, 'mcp_servers = {}\n', true)).toEqual({ ok: false, reason: 'manual' })
  })

  test('shows servers kept in an inline table as hand-edited, since no table can join them', () => {
    const text = 'mcp_servers = { other = { command = "o" } }\n'
    expect(inspectEntry(codex, text)).toBe('manual')
    expect(editEntry(codex, text, true)).toEqual({ ok: false, reason: 'manual' })
  })

  test('creates the file and tells an entry with another command apart', () => {
    expect(edited('codex', null, true)).toBe(
      '[mcp_servers.open-pencil]\ncommand = "openpencil-mcp"\n'
    )
    expect(inspectEntry(codex, "[mcp_servers.'open-pencil']\ncommand = 'bun'\n")).toBe('custom')
  })
})
