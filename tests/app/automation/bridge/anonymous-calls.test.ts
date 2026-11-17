import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as v from 'valibot'

import * as layoutModule from '@pairdraw/core/layout'

import { endAgentSession } from '@/app/automation/agents'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import {
  AutomationDocumentError,
  forgetSessionDocument
} from '@/app/automation/bridge/session-document'
import { presenceOf } from '@/app/presence/registry'
import {
  closeTab,
  createHomeTab,
  createTab,
  getActiveTabId,
  getTabsSnapshot,
  openNewFileTab,
  switchTab,
  type Tab
} from '@/app/tabs'
import { windowDocumentId } from '@/app/window/identity'

import { setupGlobals, settle } from '#tests/helpers/automation/globals'

/**
 * Seam: callers that send no agent, and the CLI's fixed session.
 * Catches each command opening its own document, a read reporting Home, and a
 * close that discards a document the caller did not open.
 * Misses the process environment the CLI reads; that is the CLI suite.
 */

const { handleRequest } = createAutomationCommandHandlers(makeFigmaFromStore)

const callSchema = v.object({
  ok: v.boolean(),
  result: v.optional(v.unknown()),
  error: v.optional(v.string()),
  target: v.optional(v.object({ documentId: v.string() }))
})

const layerSchema = v.object({ id: v.string(), name: v.string() })

type AutomationCall = v.InferOutput<typeof callSchema>

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

/** A caller that sends no agent. The bridge treats every such call as one session. */
function requestAnonymous(
  command: string,
  args: Record<string, unknown> = {}
): Promise<AutomationCall> {
  return handleRequest(getActiveStore(), command, args).then(parseCall)
}

const cliAgent = { session: 'cli', kind: 'mcp', client: 'CLI' }

function requestCLI(command: string, args: Record<string, unknown> = {}): Promise<AutomationCall> {
  return handleRequest(getActiveStore(), command, { ...args, agent: cliAgent }).then(parseCall)
}

function shape(name: string, x: number) {
  return {
    name: 'create_shape',
    args: { type: 'RECTANGLE', x, y: 0, width: 40, height: 40, name }
  }
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

/** Saving reached the document when the refusal is anything but ownership. */
async function saveWasAllowed(pending: Promise<unknown>): Promise<void> {
  try {
    await pending
  } catch (error) {
    expect(error instanceof AutomationDocumentError && error.reason === 'not-owned').toBe(false)
  }
}

beforeEach(async () => {
  setupGlobals()
  endAgentSession('anonymous')
  endAgentSession('cli')
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
  endAgentSession('anonymous')
  endAgentSession('cli')
  forgetSessionDocument('anonymous')
  forgetSessionDocument('cli')
})

describe('a call with no session', () => {
  test('does not edit Home, and a second call reuses that document and agent', async () => {
    const home = homeTab()
    const page = home.store.graph.getNode(home.store.state.currentPageId)
    if (page?.type !== 'CANVAS') throw new Error('Home has no page')
    const before = page.childIds.length

    const first = await settle(requestAnonymous('tool', shape('One', 0)))
    const second = await settle(requestAnonymous('tool', shape('Two', 10)))

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(home.store.graph.getNode(page.id)?.childIds.length).toBe(before)
    const documents = documentTabs()
    expect(documents).toHaveLength(1)
    const document = documents[0]
    if (!document) throw new Error('The edit opened no document')
    expect(document.store.graph.getNode(layerOf(first.result).id)?.name).toBe('One')
    expect(document.store.graph.getNode(layerOf(second.result).id)?.name).toBe('Two')
    expect(presenceOf(document.store).agents.value).toHaveLength(1)
    expect(getActiveTabId()).toBe(home.id)
  })

  test('does not edit a New file tab', async () => {
    const fresh = openNewFileTab()
    const created = await settle(requestAnonymous('tool', shape('Anon', 0)))

    expect(created.ok).toBe(true)
    expect(fresh.store.graph.getNode(layerOf(created.result).id)).toBeUndefined()
    expect(documentTabs()).toHaveLength(1)
    expect(getActiveTabId()).toBe(fresh.id)
  })

  test('a read from Home reports no document', async () => {
    const read = await settle(requestAnonymous('tool', { name: 'get_selection', args: {} }))

    expect(read.ok).toBe(true)
    expect(read.target).toBeUndefined()
    expect(documentTabs()).toHaveLength(0)
  })

  test('a later read reports the document that session is editing', async () => {
    const created = await settle(requestAnonymous('tool', shape('One', 0)))
    const document = documentTabs()[0]
    if (!document) throw new Error('The edit opened no document')
    switchTab(homeTab().id)

    const read = await settle(requestAnonymous('tool', { name: 'get_selection', args: {} }))

    expect(read.ok).toBe(true)
    expect(read.target?.documentId).toBe(windowDocumentId(document.id))
    expect(document.store.graph.getNode(layerOf(created.result).id)).toBeDefined()
  })

  test('refuses to discard the document in front', async () => {
    const person = createTab()
    const pageId = person.store.state.currentPageId
    const theirs = person.store.graph.createNode('RECTANGLE', pageId, { name: 'Theirs' })
    person.store.markDocumentChanged()

    const closed = await refusal(settle(requestAnonymous('close_file', { unsaved: 'discard' })))

    expect(closed.reason).toBe('not-owned')
    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
    expect(person.store.graph.getNode(theirs.id)?.name).toBe('Theirs')
  })
})

describe('the CLI session', () => {
  test('keeps consecutive commands on one document and one agent', async () => {
    const home = homeTab()
    const first = await settle(requestCLI('tool', shape('One', 0)))
    switchTab(home.id)
    const second = await settle(requestCLI('tool', shape('Two', 20)))

    expect(documentTabs()).toHaveLength(1)
    const document = documentTabs()[0]
    if (!document) throw new Error('The edit opened no document')
    expect(document.store.graph.getNode(layerOf(first.result).id)?.name).toBe('One')
    expect(document.store.graph.getNode(layerOf(second.result).id)?.name).toBe('Two')
    expect(presenceOf(document.store).agents.value).toEqual([
      expect.objectContaining({ model: 'CLI' })
    ])
    expect(getActiveTabId()).toBe(home.id)
  })

  test('saves the document it is targeting and will not close it', async () => {
    const person = createTab()
    const pageId = person.store.state.currentPageId
    const theirs = person.store.graph.createNode('RECTANGLE', pageId, { name: 'Theirs' })
    const edited = await settle(requestCLI('tool', shape('Agent', 0)))

    await saveWasAllowed(settle(requestCLI('save_file')))
    const closed = await refusal(settle(requestCLI('close_file', { unsaved: 'discard' })))

    expect(closed.reason).toBe('not-owned')
    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
    expect(person.store.graph.getNode(theirs.id)?.name).toBe('Theirs')
    expect(person.store.graph.getNode(layerOf(edited.result).id)?.name).toBe('Agent')
  })

  test('saves the document in front when it has not opened one', async () => {
    const person = createTab()
    const pageId = person.store.state.currentPageId
    person.store.graph.createNode('RECTANGLE', pageId, { name: 'Theirs' })

    await saveWasAllowed(settle(requestCLI('save_file')))

    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
  })
})
