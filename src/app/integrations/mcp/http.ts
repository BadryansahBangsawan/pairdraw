import type { FetchLike } from '@modelcontextprotocol/client'

import { isTauri } from '@/app/tauri/env'
import { tauriFetch } from '@/app/tauri/http'

/**
 * How MCP requests and OAuth discovery reach a server: the desktop shell's HTTP client, which
 * no CORS policy stops, or the page's own fetch, which needs the server to allow this origin.
 */
export function mcpFetch(): FetchLike | undefined {
  return isTauri() ? (input, init) => tauriFetch(input, init) : undefined
}
