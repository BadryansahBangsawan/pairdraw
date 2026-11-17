/** A tool's answer to the RPC layer: success carries the tool result, failure carries its message. */
export type ToolReply = { ok: true; result: unknown } | { ok: false; error: string }

/**
 * The RPC reply for one tool answer. A tool reports a failed operation as `{ error }` (see
 * `toolFailure` in the tool schema), which must travel as a failed call so MCP clients and the CLI
 * see an error instead of a successful result that happens to hold one. A report that names the
 * failure beside other data, such as an apply that lists the operations it could not do, is a
 * failure too.
 */
export function toolReply(result: unknown): ToolReply {
  if (hasErrorMessage(result)) return { ok: false, error: result.error }
  return { ok: true, result }
}

function hasErrorMessage(result: unknown): result is { error: string } {
  if (typeof result !== 'object' || result === null || !('error' in result)) return false
  return typeof result.error === 'string'
}
