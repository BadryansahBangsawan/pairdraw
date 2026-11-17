import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Folder the development MCP server keeps its socket and discovery file in. */
export function devMCPRuntimeDirectory(runtimeId: string): string {
  const id = createHash('sha256').update(runtimeId).digest('hex').slice(0, 16)
  return join(tmpdir(), 'pairdraw-mcp', id)
}

/** `mcp.json` for that runtime, the file a client reads to find the server. */
export function devMCPDiscoveryPath(runtimeId: string): string {
  return join(devMCPRuntimeDirectory(runtimeId), 'mcp.json')
}
