import * as v from 'valibot'

import { recordDiagnostic } from '../recorder'
import type { DiagnosticEventInput } from '../types'

const mcpFailureSchema = v.object({
  operation: v.picklist(['connect', 'request', 'disconnect']),
  errorName: v.string(),
  errorCode: v.nullable(v.string()),
  retryable: v.nullable(v.boolean())
})

const acpFailureSchema = v.object({
  operation: v.picklist(['start', 'message', 'stop']),
  errorName: v.string(),
  errorCode: v.nullable(v.string()),
  retryable: v.nullable(v.boolean())
})

export function recordMCPConnectionFailure(input: v.InferOutput<typeof mcpFailureSchema>): void {
  const parsed = v.safeParse(mcpFailureSchema, input)
  if (!parsed.success) return
  recordDiagnostic({
    category: 'mcp',
    level: 'error',
    name: 'mcp.connection.failed',
    attributes: parsed.output
  } satisfies DiagnosticEventInput)
}

const mcpServerExitSchema = v.object({
  code: v.nullable(v.pipe(v.number(), v.integer())),
  signal: v.nullable(v.pipe(v.number(), v.integer())),
  /** Whether the app closed the server on purpose, such as while restarting it. */
  intentional: v.boolean()
})

export function recordMCPServerExit(input: v.InferOutput<typeof mcpServerExitSchema>): void {
  const parsed = v.safeParse(mcpServerExitSchema, input)
  if (!parsed.success) return
  recordDiagnostic({
    category: 'mcp',
    level: parsed.output.intentional ? 'info' : 'warning',
    name: 'mcp.server.exited',
    attributes: parsed.output
  } satisfies DiagnosticEventInput)
}

export function recordACPTransportFailure(input: v.InferOutput<typeof acpFailureSchema>): void {
  const parsed = v.safeParse(acpFailureSchema, input)
  if (!parsed.success) return
  recordDiagnostic({
    category: 'mcp',
    level: 'error',
    name: 'acp.transport.failed',
    attributes: parsed.output
  } satisfies DiagnosticEventInput)
}
