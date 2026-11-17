/** After this long without a tool call, a session's agent rests and leaves the canvas. */
export const MCP_AGENT_IDLE_MS = 20_000
/** A session that never says goodbye, such as one whose client crashed, is dropped after this. */
export const MCP_AGENT_GONE_MS = 10 * 60_000
