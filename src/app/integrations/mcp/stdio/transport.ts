import {
  deserializeMessage,
  serializeMessage,
  type JSONRPCMessage,
  type Transport
} from '@modelcontextprotocol/client'

import type { MCPStdioEvent, MCPStdioNative, MCPStdioSpawnRequest } from './native'

/**
 * An MCP client transport over a local process the desktop shell runs: newline-delimited
 * JSON-RPC on its stdin and stdout, as the MCP stdio transport specifies.
 */
export class NativeStdioTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  private handle: number | null = null
  private closed = false

  constructor(
    private readonly request: MCPStdioSpawnRequest,
    private readonly native: MCPStdioNative
  ) {}

  async start(): Promise<void> {
    if (this.handle !== null || this.closed) throw new Error('The transport was already started')
    this.handle = await this.native.spawn(this.request, (event) => this.receive(event))
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.handle === null || this.closed) throw new Error('The local MCP server is not running')
    await this.native.write(this.handle, serializeMessage(message))
  }

  async close(): Promise<void> {
    const handle = this.handle
    if (handle === null || this.closed) {
      this.finish()
      return
    }
    try {
      await this.native.close(handle)
    } finally {
      this.finish()
    }
  }

  private receive(event: MCPStdioEvent): void {
    if (this.closed) return
    if (event.kind === 'exit') {
      this.finish()
      return
    }
    const line = event.line.trim()
    if (!line) return
    let message: JSONRPCMessage
    try {
      message = deserializeMessage(line)
    } catch (error) {
      // A server may log to stdout by mistake; a line that is not JSON-RPC is reported, not fatal.
      this.onerror?.(error instanceof Error ? error : new Error(String(error)))
      return
    }
    this.onmessage?.(message)
  }

  private finish(): void {
    if (this.closed) return
    this.closed = true
    this.onclose?.()
  }
}
