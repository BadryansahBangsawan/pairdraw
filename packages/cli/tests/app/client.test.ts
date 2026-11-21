import { describe, expect, test } from 'bun:test'

import { rpcTimeoutMs } from '#cli/app/client'

describe('how long the CLI waits for the app', () => {
  test('waits past the app’s own long deadline for a long tool such as a recording', () => {
    // The MCP bridge gives a long tool 120 s, so the CLI outlasts it and reads its answer.
    expect(rpcTimeoutMs('tool', { name: 'export_video', args: {} })).toBeGreaterThan(120_000)
  })

  test('keeps the short deadline for other calls', () => {
    expect(rpcTimeoutMs('tool', { name: 'get_selection', args: {} })).toBe(30_000)
    expect(rpcTimeoutMs('list_documents', {})).toBe(30_000)
  })
})
