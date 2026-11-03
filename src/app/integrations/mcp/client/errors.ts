/** Why a connection could not be used, for Settings to say what would fix it. */
export type MCPConnectFailure = 'sign-in' | 'credential' | 'desktop-only' | 'declined' | 'failed'

/** Thrown by `connectMCPClient` with the reason Settings shows. */
export class MCPConnectError extends Error {
  constructor(
    readonly reason: MCPConnectFailure,
    options?: { cause?: unknown }
  ) {
    super(`The MCP connection could not be used (${reason})`, options)
    this.name = 'MCPConnectError'
  }
}
