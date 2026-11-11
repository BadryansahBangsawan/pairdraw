import * as v from 'valibot'

import { acpAllowedMetaSchema, acpClientMessageSchema, acpHTTPServerSchema } from './schema'

/** One ndjson line may be this long; a prompt with images stays well below it. */
const MAX_LINE_BYTES = 16 * 1024 * 1024
const NEWLINE = 0x0a

export interface ACPFilterOptions {
  /** The folder every session runs in, whatever the app asked for. */
  workspace: string
  /** Whether a URL is this companion's own MCP endpoint, the only server an agent may reach. */
  isOwnMCP: (url: string) => boolean
}

/**
 * What the companion lets through from the app to an agent. A session's working folder, the
 * MCP servers it starts, and options the agent hands its SDK would otherwise let a tab run any
 * program: an MCP server entry is a command line, and Claude's adapter takes its executable and
 * environment from `_meta`. So every session runs in the companion's workspace, reaches only
 * the companion's own MCP server, and keeps only the `_meta` the app sends.
 */
function sanitizeACPMessage(
  text: string,
  { workspace, isOwnMCP }: ACPFilterOptions
): string | null {
  const parsed = v.safeParse(acpClientMessageSchema, text)
  if (!parsed.success) return null
  const message = parsed.output
  const params = message.params
  if (!params) return JSON.stringify(message)
  const meta = v.safeParse(acpAllowedMetaSchema, params._meta)
  if (meta.success) params._meta = meta.output
  else delete params._meta
  if ('cwd' in params) params.cwd = workspace
  if ('additionalDirectories' in params) delete params.additionalDirectories
  if ('mcpServers' in params) {
    const servers = Array.isArray(params.mcpServers) ? params.mcpServers : []
    params.mcpServers = servers.filter((server) => {
      const http = v.safeParse(acpHTTPServerSchema, server)
      return http.success && isOwnMCP(http.output.url)
    })
  }
  return JSON.stringify(message)
}

/**
 * Splits the app's bytes into ndjson lines and passes each through `sanitizeACPMessage`.
 * Returns the bytes to write to the agent, or null when a line is not a JSON-RPC message or
 * grows past the limit, in which case the socket closes.
 */
export function createACPFilter(options: ACPFilterOptions) {
  let pending: Buffer = Buffer.alloc(0)
  return (chunk: Buffer): Buffer | null => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
    const out: Buffer[] = []
    for (;;) {
      const end = pending.indexOf(NEWLINE)
      if (end === -1) break
      const line = pending.subarray(0, end).toString('utf8')
      pending = pending.subarray(end + 1)
      if (!line.trim()) continue
      const clean = sanitizeACPMessage(line, options)
      if (clean === null) return null
      out.push(Buffer.from(`${clean}\n`, 'utf8'))
    }
    if (pending.length > MAX_LINE_BYTES) return null
    return Buffer.concat(out)
  }
}

/** Whether a URL is the MCP endpoint of the companion listening on `port` on this machine. */
export function isLoopbackMCP(url: string, port: number): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) &&
      Number(parsed.port) === port &&
      parsed.pathname === '/mcp'
    )
  } catch {
    return false
  }
}
