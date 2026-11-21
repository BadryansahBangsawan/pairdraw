import { describe, expect, test } from 'bun:test'

import type { RPCJSONObject } from '#mcp/json'
import { scopeRPC } from '#mcp/tool/scope'
import {
  isToolEnabled,
  narrowestScope,
  parseToolScope,
  type ToolDescriptor
} from '@pairdraw/mcp/tools'

function tool(name: string): ToolDescriptor {
  return {
    name,
    description: name,
    effect: 'read',
    availability: 'default',
    capabilities: ['document:read'],
    enabled: true
  }
}

describe('MCP tool scope', () => {
  test('reads the scope, defaulting to the document', () => {
    expect(parseToolScope(undefined)).toBe('document')
    expect(parseToolScope('selection')).toBe('selection')
    expect(parseToolScope(' ')).toBe('document')
    expect(() => parseToolScope('page')).toThrow(/PAIRDRAW_MCP_SCOPE/)
  })

  test('keeps only the selection tools in selection scope', () => {
    const policy = { allowEval: false, disabledTools: ['describe'], scope: 'selection' as const }
    expect(isToolEnabled(tool('get_node'), policy)).toBe(true)
    expect(isToolEnabled(tool('delete_node'), policy)).toBe(false)
    expect(isToolEnabled(tool('list_documents'), policy)).toBe(false)
    // Turning a tool off still applies inside the scope.
    expect(isToolEnabled(tool('describe'), policy)).toBe(false)
  })

  test('a client follows the narrower of its own scope and the server scope', () => {
    expect(narrowestScope('selection', 'document')).toBe('selection')
    expect(narrowestScope('document', 'selection')).toBe('selection')
    expect(narrowestScope('document', 'document')).toBe('document')
  })

  test('forwards the caller signal in both scopes', async () => {
    const seen: Array<AbortSignal | undefined> = []
    const send = async (_msg: RPCJSONObject, signal?: AbortSignal) => {
      seen.push(signal)
      return { ok: true }
    }
    const controller = new AbortController()
    const body: RPCJSONObject = { command: 'tool', args: { name: 'get_selection' } }

    await scopeRPC(send, 'document')(body, controller.signal)
    await scopeRPC(send, 'selection')(body, controller.signal)

    expect(seen).toEqual([controller.signal, controller.signal])
  })
})
