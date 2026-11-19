import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as layoutModule from '@pairdraw/core/layout'

import { endAgentSession } from '@/app/automation/agents'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import { automationFiles } from '@/app/automation/bridge/server'
import { createTab, getActiveStore } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'

/**
 * A browser document opened through the MCP server's `/files/` route keeps that URL as its
 * path. Saving it without a path writes back through the same server, as `documents save`
 * promises; it once failed with "has not been saved to a file yet".
 */
const { handleRequest } = createAutomationCommandHandlers(
  makeFigmaFromStore,
  automationFiles('ws://mcp.test', 'token')
)

beforeEach(() => {
  globalThis.window = asDouble<Window & typeof globalThis>({
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      setTimeout(() => callback(performance.now()), 0)
      return 0
    },
    cancelAnimationFrame: vi.fn(),
    pairdraw: {},
    location: { href: 'http://localhost/' } as Location,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  globalThis.document = asDouble<Document>({
    fonts: { add: vi.fn(), ready: Promise.resolve() },
    querySelector: () => null
  })
  globalThis.requestAnimationFrame = window.requestAnimationFrame
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
  Reflect.deleteProperty(globalThis, 'cancelAnimationFrame')
  endAgentSession('anonymous')
})

describe('saving a server-opened document without a path', () => {
  test('writes the document back to the file it was opened from', async () => {
    const tab = createTab()
    tab.store.setDocumentSource(
      'design.fig',
      'fig',
      undefined,
      'http://mcp.test/files//root/design.fig'
    )
    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)
    expect(tab.store.hasUnsavedChanges()).toBe(true)
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))

    await handleRequest(getActiveStore(), 'save_file', { document_id: tab.id })

    const [url, init] = fetch.mock.calls[0]
    expect(String(url)).toBe('http://mcp.test/files//root/design.fig')
    expect(init?.method).toBe('PUT')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token')
    expect(tab.store.hasUnsavedChanges()).toBe(false)
  })

  test('a document opened from another origin still asks for a path', async () => {
    const tab = createTab()
    tab.store.setDocumentSource(
      'remote.fig',
      'fig',
      undefined,
      'http://elsewhere.test/files//root/remote.fig'
    )
    tab.store.createShape('RECTANGLE', 0, 0, 10, 10)

    await expect(
      handleRequest(getActiveStore(), 'save_file', { document_id: tab.id })
    ).rejects.toThrow('has not been saved to a file yet')
  })
})
