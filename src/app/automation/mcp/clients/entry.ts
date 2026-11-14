import { isEqual, isPlainObject, omit } from 'es-toolkit'

import { MCP_CLIENT_COMMAND, MCP_CLIENT_ENTRY } from './catalog'
import type { MCPClientJSONFormat, MCPClient } from './catalog'
import { removeNestedMember, setNestedMember } from './json/edit'
import { parseJSONTree, treeValue } from './json/tree'
import { appendServerTable, removeServerTables, scanServer } from './toml'

/**
 * Where a client's config stands on the `pairdraw` entry:
 * - `absent`: no entry; turning it on adds one.
 * - `added`: the entry starts `pairdraw-mcp`.
 * - `custom`: the entry starts something else, such as a source checkout; turning it off removes it.
 * - `manual`: an entry written in a form Pairdraw does not rewrite, or Codex servers kept in an
 *   inline table, which no entry table can join.
 * - `invalid`: the file is not valid in its format, so Pairdraw leaves it alone.
 */
export type MCPClientEntryState = 'absent' | 'added' | 'custom' | 'manual' | 'invalid'

export type MCPClientEditFailure = 'invalid' | 'manual'

export type MCPClientEdit = { ok: true; text: string } | { ok: false; reason: MCPClientEditFailure }

/** The command an entry starts: `command`, or OpenCode's command array's first word. */
function entryCommand(entry: unknown): string | undefined {
  if (!isPlainObject(entry)) return undefined
  const command: unknown = entry.command
  if (typeof command === 'string') return command
  if (Array.isArray(command)) {
    const [first]: unknown[] = command
    return typeof first === 'string' ? first : undefined
  }
  return undefined
}

function commandState(command: string | undefined): MCPClientEntryState {
  return command === MCP_CLIENT_COMMAND ? 'added' : 'custom'
}

type JSONDocument = { ok: true; value: Record<string, unknown> } | { ok: false }

function readJSON(text: string): JSONDocument {
  if (text.trim() === '') return { ok: true, value: {} }
  const tree = parseJSONTree(text)
  const value = tree ? treeValue(tree) : undefined
  return isPlainObject(value) ? { ok: true, value } : { ok: false }
}

/** The servers object, `{}` when there is none, `undefined` when it is not an object. */
function jsonServers(
  value: Record<string, unknown>,
  format: MCPClientJSONFormat
): Record<string, unknown> | undefined {
  const servers = value[format.container]
  if (servers === undefined) return {}
  return isPlainObject(servers) ? servers : undefined
}

function inspectJSON(text: string, format: MCPClientJSONFormat): MCPClientEntryState {
  const document = readJSON(text)
  if (!document.ok) return 'invalid'
  const servers = jsonServers(document.value, format)
  if (!servers) return 'invalid'
  if (!Object.hasOwn(servers, MCP_CLIENT_ENTRY)) return 'absent'
  return commandState(entryCommand(servers[MCP_CLIENT_ENTRY]))
}

function inspectTOML(text: string): MCPClientEntryState {
  const scan = scanServer(text, MCP_CLIENT_ENTRY)
  // Servers kept in an inline table cannot gain a table of their own, so the entry is hand-edited.
  if (scan.otherForm || scan.inlineServers) return 'manual'
  if (scan.blocks.length === 0) return 'absent'
  return commandState(scan.command)
}

/** Where `client`'s config text stands on the entry; `null` text is a file not written yet. */
export function inspectEntry(client: MCPClient, text: string | null): MCPClientEntryState {
  const source = text ?? ''
  return client.format.kind === 'toml' ? inspectTOML(source) : inspectJSON(source, client.format)
}

function editJSON(text: string, format: MCPClientJSONFormat, enabled: boolean): MCPClientEdit {
  const before = readJSON(text)
  if (!before.ok) return { ok: false, reason: 'invalid' }
  const servers = jsonServers(before.value, format)
  if (!servers) return { ok: false, reason: 'invalid' }
  if (Object.hasOwn(servers, MCP_CLIENT_ENTRY) === enabled) return { ok: true, text }
  const edited = enabled
    ? setNestedMember(text, format.container, MCP_CLIENT_ENTRY, format.entry)
    : removeNestedMember(text, format.container, MCP_CLIENT_ENTRY)
  if (edited === null) return { ok: false, reason: 'invalid' }
  // The edit must change the entry and nothing else, or the file is left as it was.
  const after = readJSON(edited)
  const expectedServers = enabled
    ? { ...servers, [MCP_CLIENT_ENTRY]: format.entry }
    : omit(servers, [MCP_CLIENT_ENTRY])
  const expected = { ...before.value, [format.container]: expectedServers }
  return after.ok && isEqual(after.value, expected)
    ? { ok: true, text: edited }
    : { ok: false, reason: 'invalid' }
}

function editTOML(text: string, enabled: boolean): MCPClientEdit {
  const scan = scanServer(text, MCP_CLIENT_ENTRY)
  if (scan.otherForm || (enabled && scan.inlineServers)) return { ok: false, reason: 'manual' }
  if (scan.blocks.length > 0 === enabled) return { ok: true, text }
  const edited = enabled
    ? appendServerTable(text, MCP_CLIENT_ENTRY, MCP_CLIENT_COMMAND)
    : removeServerTables(text, scan)
  const after = scanServer(edited, MCP_CLIENT_ENTRY)
  const own = (headers: string[]) =>
    headers.filter((header) => !header.startsWith(`mcp_servers\u0000${MCP_CLIENT_ENTRY}`))
  const kept = isEqual(own(after.headers), own(scan.headers))
  const done = enabled ? after.table && after.command === MCP_CLIENT_COMMAND : !after.blocks.length
  return kept && done && !after.otherForm
    ? { ok: true, text: edited }
    : { ok: false, reason: 'invalid' }
}

/**
 * `client`'s config text with the entry added or removed, the rest of the file untouched; the
 * text itself when it already is that way.
 */
export function editEntry(client: MCPClient, text: string | null, enabled: boolean): MCPClientEdit {
  const source = text ?? ''
  return client.format.kind === 'toml'
    ? editTOML(source, enabled)
    : editJSON(source, client.format, enabled)
}
