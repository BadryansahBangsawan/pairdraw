import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, jest, test, vi } from 'bun:test'

import * as v from 'valibot'

import * as layoutModule from '@pairdraw/core/layout'

import { endAgentSession } from '@/app/automation/agents'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import {
  AutomationDocumentError,
  forgetSessionDocument,
  markSessionDocumentClosed,
  rememberSessionDocument,
  sessionDocument
} from '@/app/automation/bridge/session-document'
import { MCP_AGENT_GONE_MS } from '@/app/automation/lifetime'
import { resolveBrowserFileURL } from '@/app/document/io/browser'
import {
  closeTab,
  createHomeTab,
  createTab,
  getActiveTabId,
  getTabsSnapshot,
  switchTab,
  type Tab
} from '@/app/tabs'

import { setupGlobals, settle } from '#tests/helpers/automation/globals'
import { asDouble } from '#tests/helpers/doubles'

/**
 * Seam: whether a session owns the document it is editing.
 * Catches a close that discards someone else's file, and a session that keeps
 * a document after it has gone. Misses the tab the person is looking at.
 */

const { handleRequest } = createAutomationCommandHandlers(makeFigmaFromStore)

const callSchema = v.object({
  ok: v.boolean(),
  result: v.optional(v.unknown()),
  target: v.optional(v.object({ documentId: v.string() }))
})

const layerSchema = v.object({ id: v.string(), name: v.string() })

type AutomationCall = v.InferOutput<typeof callSchema>

let sessionSerial = 0
let sessionName = 'owner-0'

function request(
  command: string,
  args: Record<string, unknown> = {},
  session = sessionName
): Promise<AutomationCall> {
  return handleRequest(getActiveStore(), command, {
    ...args,
    agent: { session, kind: 'mcp', client: 'test' }
  }).then(parseCall)
}

function parseCall(raw: unknown): AutomationCall {
  const parsed = v.safeParse(callSchema, raw)
  if (!parsed.success) throw new Error('The automation call returned an unexpected shape')
  return parsed.output
}

function layerOf(result: unknown): v.InferOutput<typeof layerSchema> {
  const parsed = v.safeParse(layerSchema, result)
  if (!parsed.success) throw new Error('The call returned no layer')
  return parsed.output
}

function getActiveStore() {
  const tab = getTabsSnapshot().find((entry) => entry.id === getActiveTabId())
  if (!tab) throw new Error('No active tab')
  return tab.store
}

function homeTab(): Tab {
  const home = getTabsSnapshot().find((tab) => tab.kind === 'home')
  if (!home) throw new Error('Home is missing')
  return home
}

function documentTabs(): Tab[] {
  return getTabsSnapshot().filter((tab) => tab.kind === 'document')
}

async function refusal(pending: Promise<unknown>): Promise<AutomationDocumentError> {
  try {
    await pending
  } catch (error) {
    if (error instanceof AutomationDocumentError) return error
    throw error
  }
  throw new Error('The call succeeded')
}

async function createRectangle(name: string, session = sessionName): Promise<string> {
  const created = await settle(
    request(
      'tool',
      {
        name: 'create_shape',
        args: { type: 'RECTANGLE', x: 0, y: 0, width: 40, height: 40, name }
      },
      session
    )
  )
  if (!created.ok) throw new Error('The edit created no layer')
  return layerOf(created.result).id
}

beforeEach(async () => {
  setupGlobals()
  sessionSerial += 1
  sessionName = `owner-${sessionSerial}`
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  createHomeTab()
  for (const tab of getTabsSnapshot()) {
    if (tab.kind !== 'home') await closeTab(tab.id, 'discard')
  }
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const tab of getTabsSnapshot()) {
    if (tab.kind !== 'home') await closeTab(tab.id, 'discard')
  }
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
  Reflect.deleteProperty(globalThis, 'cancelAnimationFrame')
  endAgentSession(sessionName)
  endAgentSession('session-next')
  endAgentSession('anonymous')
  endAgentSession('cli')
  forgetSessionDocument(sessionName)
  forgetSessionDocument('session-next')
})

describe('opening a file the person already has open', () => {
  test('does not take ownership, so a later close leaves their changes', async () => {
    const person = createTab()
    const pageId = person.store.state.currentPageId
    const theirs = person.store.graph.createNode('RECTANGLE', pageId, { name: 'Theirs' })
    person.store.markDocumentChanged()
    const path = 'board.pen'
    person.store.setDocumentSource('board.pen', 'pen', undefined, resolveBrowserFileURL(path).href)
    switchTab(homeTab().id)
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      asDouble<typeof fetch>(async () => new Response(new Uint8Array([1]), { status: 200 }))
    )

    await settle(request('open_file', { path }))
    const closed = await refusal(settle(request('close_file', { unsaved: 'discard' })))

    expect(closed.reason).toBe('not-owned')
    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
    expect(person.store.graph.getNode(theirs.id)?.name).toBe('Theirs')
  })
})

describe('session document memory', () => {
  test('drops the document after the client has been gone', () => {
    const tab = createTab()
    jest.useFakeTimers()
    try {
      rememberSessionDocument(sessionName, tab.id, true)
      jest.advanceTimersByTime(MCP_AGENT_GONE_MS - 1)
      // A call during the quiet period starts it again. The next wait is a full period.
      expect(sessionDocument(sessionName)).toMatchObject({ owns: true })
      jest.advanceTimersByTime(MCP_AGENT_GONE_MS - 1)
      expect(sessionDocument(sessionName)).toMatchObject({ owns: true })

      forgetSessionDocument(sessionName)
      rememberSessionDocument(sessionName, tab.id, true)
      jest.advanceTimersByTime(MCP_AGENT_GONE_MS)
      expect(sessionDocument(sessionName)).toBe('none')
    } finally {
      jest.useRealTimers()
      forgetSessionDocument(sessionName)
    }
  })

  test('drops a closed document when the session ends, and after the client is gone', () => {
    const tab = createTab()
    rememberSessionDocument(sessionName, tab.id, true)
    markSessionDocumentClosed(sessionName)
    endAgentSession(sessionName)
    expect(sessionDocument(sessionName)).toBe('none')

    jest.useFakeTimers()
    try {
      rememberSessionDocument(sessionName, tab.id, true)
      markSessionDocumentClosed(sessionName)
      jest.advanceTimersByTime(MCP_AGENT_GONE_MS)
      expect(sessionDocument(sessionName)).toBe('none')
    } finally {
      jest.useRealTimers()
      forgetSessionDocument(sessionName)
    }
  })

  test('a new session does not edit the document an earlier session left behind', async () => {
    const id = await createRectangle('Card')
    const first = documentTabs()[0]
    if (!first) throw new Error('The edit opened no document')
    await settle(request('agent_session_closed', { session: sessionName }))
    switchTab(homeTab().id)

    const second = await createRectangle('Other', 'session-next')

    expect(first.store.graph.getNode(id)).toBeDefined()
    expect(first.store.graph.getNode(second)).toBeUndefined()
    expect(documentTabs()).toHaveLength(2)
  })
})
