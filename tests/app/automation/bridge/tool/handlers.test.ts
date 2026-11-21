import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import type { AutomationTarget } from '@/app/automation/bridge/target'
import { createAutomationToolHandler } from '@/app/automation/bridge/tool-handlers'

import { asDouble } from '#tests/helpers/doubles'

function target() {
  const store = asDouble<
    Parameters<typeof createAutomationToolHandler>[0] extends (
      store: infer S,
      pageId?: string
    ) => unknown
      ? S
      : never
  >({
    graph: new SceneGraph(),
    state: { currentPageId: '0:1', selectedIds: new Set<string>() },
    requestRender: () => undefined
  })
  return asDouble<AutomationTarget>({
    store,
    pageId: '0:1',
    pageName: 'Page 1',
    documentId: 'main:tab-0',
    documentName: 'Untitled'
  })
}

describe('the bridge tool handler', () => {
  test('reports a failed tool operation as a failed call', async () => {
    const handler = createAutomationToolHandler(
      () => asDouble<never>({}),
      async () => ({ error: 'Node "9:9" not found' })
    )

    const reply = await handler(target(), { name: 'get_node', args: { id: '9:9' } })

    expect(reply).toEqual({ ok: false, error: 'Node "9:9" not found' })
  })

  test('passes a cancelled request signal to the tool', async () => {
    const controller = new AbortController()
    let seen: AbortSignal | undefined
    const handler = createAutomationToolHandler(
      () => asDouble<never>({}),
      async (call) => {
        seen = call.signal
        return { id: '9:9' }
      }
    )

    await handler(target(), { name: 'get_node', args: { id: '9:9' } }, controller.signal)

    expect(seen).toBe(controller.signal)
  })

  test('reports a tool answer as a successful call', async () => {
    const handler = createAutomationToolHandler(
      () => asDouble<never>({}),
      async () => ({ id: '9:9', name: 'Card' })
    )

    const reply = await handler(target(), { name: 'get_node', args: { id: '9:9' } })

    expect(reply).toEqual({ ok: true, result: { id: '9:9', name: 'Card' } })
  })

  test('refuses design memory breaks for agents, and only warns the CLI that asks for it', async () => {
    const modes: unknown[] = []
    const handler = createAutomationToolHandler(
      () => asDouble<never>({}),
      async (call) => {
        modes.push(call.designMemory)
        return { ok: true }
      }
    )
    await handler(target(), { name: 'get_node', args: { id: '1:1' } })
    await handler(target(), { name: 'get_node', args: { id: '1:1' }, designMemory: 'warn' })
    await handler(target(), { name: 'get_node', args: { id: '1:1' }, designMemory: 'other' })
    expect(modes).toEqual(['refuse', 'warn', 'refuse'])
  })
})
