import { escapeRegExp } from 'es-toolkit'

/**
 * The `[mcp_servers.<name>]` table of a Codex `config.toml`, found and edited line by line so
 * the rest of the file keeps its comments, order, and spacing. A server written in another form,
 * such as an inline table or dotted keys, is reported rather than rewritten.
 */

const SERVERS_TABLE = 'mcp_servers'
const TABLE_PATTERN = /^\s*\[(?!\[)\s*(.+?)\s*\]\s*(?:#.*)?$/
const ARRAY_TABLE_PATTERN = /^\s*\[\[\s*(.+?)\s*\]\]\s*(?:#.*)?$/
const KEY_VALUE_PATTERN = /^\s*([^=#[\]]+?)\s*=\s*(.*)$/
const BARE_KEY_PATTERN = /^[A-Za-z0-9_-]+/
const BASIC_ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
}

/** A dotted TOML key, such as `mcp_servers."pairdraw".env`, as its parts. */
function parseKeyPath(source: string): string[] | null {
  const parts: string[] = []
  let index = 0
  for (;;) {
    while (source[index] === ' ' || source[index] === '\t') index++
    const char = source[index]
    if (char === '"') {
      let part = ''
      index++
      while (index < source.length && source[index] !== '"') {
        if (source[index] === '\\') {
          const escape = source[index + 1]
          if (!Object.hasOwn(BASIC_ESCAPES, escape)) return null
          part += BASIC_ESCAPES[escape]
          index += 2
        } else {
          part += source[index]
          index++
        }
      }
      if (source[index] !== '"') return null
      index++
      parts.push(part)
    } else if (char === "'") {
      const end = source.indexOf("'", index + 1)
      if (end === -1) return null
      parts.push(source.slice(index + 1, end))
      index = end + 1
    } else {
      const bare = BARE_KEY_PATTERN.exec(source.slice(index))
      if (!bare) return null
      parts.push(bare[0])
      index += bare[0].length
    }
    while (source[index] === ' ' || source[index] === '\t') index++
    if (index >= source.length) return parts
    if (source[index] !== '.') return null
    index++
  }
}

/** A string value written as a TOML basic or literal string on one line. */
function stringValue(source: string): string | undefined {
  const basic = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(source)
  if (basic) {
    return basic[1].replaceAll(/\\(.)/g, (whole: string, escape: string) =>
      Object.hasOwn(BASIC_ESCAPES, escape) ? BASIC_ESCAPES[escape] : whole
    )
  }
  return /^'([^']*)'\s*(?:#.*)?$/.exec(source)?.[1]
}

interface TableHeader {
  line: number
  path: string[]
}

/** What a scan of the file found about one server's entry. */
export interface TOMLServerScan {
  /** Line ranges `[start, end)` of the server's tables, its own and its sub-tables. */
  blocks: [number, number][]
  /** The `command` of the server's own table, when it is a one-line string. */
  command?: string
  /** Its own table exists. */
  table: boolean
  /** The server is written in a form other than its own table. */
  otherForm: boolean
  /** `mcp_servers` is an inline table, which cannot gain a table of its own. */
  inlineServers: boolean
  /** Every table header, by path, to compare a file before and after an edit. */
  headers: string[]
}

/** Lines that open a table, outside multi-line strings. */
function tableHeaders(lines: readonly string[]): (TableHeader | null)[] {
  let open: '"""' | "'''" | null = null
  return lines.map((line, number) => {
    let header: TableHeader | null = null
    if (!open) {
      const table = TABLE_PATTERN.exec(line) ?? ARRAY_TABLE_PATTERN.exec(line)
      const path = table ? parseKeyPath(table[1]) : null
      if (path) header = { line: number, path }
    }
    let index = 0
    for (;;) {
      if (open) {
        const close = line.indexOf(open, index)
        if (close === -1) break
        index = close + 3
        open = null
        continue
      }
      const basic = line.indexOf('"""', index)
      const literal = line.indexOf("'''", index)
      const next = [basic, literal].filter((at) => at !== -1)
      if (next.length === 0) break
      const at = Math.min(...next)
      open = at === basic ? '"""' : "'''"
      index = at + 3
    }
    return header
  })
}

function startsWith(path: readonly string[], prefix: readonly string[]): boolean {
  return prefix.every((part, index) => path[index] === part)
}

export function scanServer(text: string, name: string): TOMLServerScan {
  const lines = text.split(/\r?\n/)
  const headers = tableHeaders(lines)
  const own = [SERVERS_TABLE, name]
  const scan: TOMLServerScan = {
    blocks: [],
    table: false,
    otherForm: false,
    inlineServers: false,
    headers: []
  }
  let current: string[] = []
  let block: [number, number] | null = null
  lines.forEach((line, number) => {
    const header = headers[number]
    if (header) {
      if (block) block[1] = number
      block = null
      current = header.path
      scan.headers.push(header.path.join('\u0000'))
      if (startsWith(header.path, own)) {
        block = [number, lines.length]
        scan.blocks.push(block)
        if (header.path.length === own.length) scan.table = true
      }
      return
    }
    const keyValue = KEY_VALUE_PATTERN.exec(line)
    const key = keyValue ? parseKeyPath(keyValue[1]) : null
    if (!keyValue || !key) return
    const path = [...current, ...key]
    if (current.length === own.length && startsWith(current, own) && key.join('.') === 'command') {
      scan.command = stringValue(keyValue[2].trim())
    }
    if (current.length === 0 && path.length === 1 && path[0] === SERVERS_TABLE) {
      scan.inlineServers = true
      const named = new RegExp(`(^|[{,\\s])["']?${escapeRegExp(name)}["']?\\s*=`)
      if (named.test(keyValue[2])) scan.otherForm = true
    }
    if (current.length < own.length && startsWith(path, own)) scan.otherForm = true
  })
  return scan
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('#')
}

function lineBreak(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

/** The file without the server's tables; comments just above the next table stay with it. */
export function removeServerTables(text: string, scan: TOMLServerScan): string {
  const lines = text.split(/\r?\n/)
  for (const [start, blockEnd] of scan.blocks.toReversed()) {
    let end = blockEnd
    while (end > start + 1 && isBlankOrComment(lines[end - 1])) end--
    lines.splice(start, end - start)
    // Keep one blank line where the removed tables were, and none at the end of the file.
    let at = start
    while (
      at > 0 &&
      lines[at - 1].trim() === '' &&
      (at >= lines.length - 1 || lines[at].trim() === '')
    ) {
      lines.splice(at - 1, 1)
      at--
    }
    if (at === 0) {
      while (lines.length > 1 && lines[0].trim() === '') lines.splice(0, 1)
    }
  }
  return lines.join(lineBreak(text))
}

/** The file with a table for the server appended. */
export function appendServerTable(text: string, name: string, command: string): string {
  const eol = lineBreak(text)
  const table = [
    `[${SERVERS_TABLE}.${JSON.stringify(name)}]`,
    `command = ${JSON.stringify(command)}`
  ]
  if (BARE_KEY_PATTERN.exec(name)?.[0] === name) table[0] = `[${SERVERS_TABLE}.${name}]`
  if (text.trim() === '') return table.join(eol) + eol
  const ended = /\r?\n$/.test(text) ? text : text + eol
  const separated = /(\r?\n){2}$/.test(ended) ? ended : ended + eol
  return separated + table.join(eol) + eol
}
