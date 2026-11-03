import * as v from 'valibot'

export interface MCPStdioSpawnRequest {
  /** The connection the process serves, which names its approval and its log lines. */
  connectionId: string
  name: string
  command: string
  args: string[]
  env: { name: string; value: string }[]
  /**
   * The app's language, which only picks one of the shell's own translations of the approval
   * dialog: the shell words the question and its buttons itself, so the webview cannot.
   */
  locale: string
}

const stdioEventSchema = v.variant('kind', [
  v.object({ kind: v.literal('message'), line: v.string() }),
  v.object({ kind: v.literal('exit'), code: v.nullable(v.number()) })
])

/** A line the process wrote to stdout, or its exit. */
export type MCPStdioEvent = v.InferOutput<typeof stdioEventSchema>

export function parseMCPStdioEvent(value: unknown): MCPStdioEvent | null {
  const parsed = v.safeParse(stdioEventSchema, value)
  return parsed.success ? parsed.output : null
}

const stdioErrorSchema = v.object({
  kind: v.picklist(['declined', 'not-found', 'invalid', 'failed']),
  message: v.optional(v.string())
})

export type MCPStdioErrorKind = v.InferOutput<typeof stdioErrorSchema>['kind']

/** Why the desktop shell did not start the process. */
export class MCPStdioError extends Error {
  constructor(
    readonly kind: MCPStdioErrorKind,
    message?: string
  ) {
    super(message ?? `The local MCP server could not start (${kind})`)
    this.name = 'MCPStdioError'
  }
}

function stdioError(error: unknown): MCPStdioError {
  const parsed = v.safeParse(stdioErrorSchema, error)
  if (parsed.success) return new MCPStdioError(parsed.output.kind, parsed.output.message)
  return new MCPStdioError('failed', error instanceof Error ? error.message : String(error))
}

/** The desktop shell's process host for local MCP servers (`desktop/src/agents/mcp_stdio.rs`). */
export interface MCPStdioNative {
  /**
   * Asks the person to approve the command line without starting it, as for a coding agent
   * that starts it itself; resolves the approved program's path.
   */
  approve(request: MCPStdioSpawnRequest): Promise<string>
  /** Starts the process, after the person approved its command line; resolves its handle. */
  spawn(request: MCPStdioSpawnRequest, onEvent: (event: MCPStdioEvent) => void): Promise<number>
  /** Writes one newline-terminated JSON-RPC message to its stdin. */
  write(handle: number, line: string): Promise<void>
  /** Stops the process; its exit event follows. */
  close(handle: number): Promise<void>
}

export const tauriMCPStdio: MCPStdioNative = {
  async approve(request) {
    const { invoke } = await import('@tauri-apps/api/core')
    try {
      return await invoke<string>('mcp_stdio_approve', { request })
    } catch (error) {
      throw stdioError(error)
    }
  },
  async spawn(request, onEvent) {
    const { Channel, invoke } = await import('@tauri-apps/api/core')
    const channel = new Channel<unknown>()
    channel.onmessage = (message) => {
      const event = parseMCPStdioEvent(message)
      if (event) onEvent(event)
    }
    try {
      return await invoke<number>('mcp_stdio_spawn', { request, onEvent: channel })
    } catch (error) {
      throw stdioError(error)
    }
  },
  async write(handle, line) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('mcp_stdio_write', { handle, line })
  },
  async close(handle) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('mcp_stdio_close', { handle })
  }
}
