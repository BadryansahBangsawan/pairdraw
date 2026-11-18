import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import * as v from 'valibot'

import * as layoutModule from '@pairdraw/core/layout'

import { endAgentSession } from '@/app/automation/agents'
import { handleBrowserSnapshot } from '@/app/automation/bridge/browser-snapshot'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import {
  AutomationDocumentError,
  forgetSessionDocument
} from '@/app/automation/bridge/session-document'
import { requireWebMCPDocument } from '@/app/automation/webmcp/runtime'
import * as browserBridge from '@/app/browser/bridge'
import * as browserCommand from '@/app/browser/node/command'
import { browserState } from '@/app/browser/state'
import * as activeStore from '@/app/editor/active-store'
import {
  closeTab,
  createHomeTab,
  createTab,
  getActiveTabId,
  getTabsSnapshot,
  openNewFileTab,
  switchTab,
  tabCount,
  type Tab
} from '@/app/tabs'
import { windowDocumentId } from '@/app/window/identity'

import { setupGlobals, settle } from '#tests/helpers/automation/globals'

/**
 * Seam: an MCP edit while Home or New file is in front.
 * Catches an edit with no document id landing on that tab's store.
 * Misses a desktop file claim the browser does not have.
 */

const { handleRequest } = createAutomationCommandHandlers(makeFigmaFromStore)

const callSchema = v.object({
  ok: v.boolean(),
  result: v.optional(v.unknown()),
  error: v.optional(v.string()),
  target: v.optional(v.object({ documentId: v.string() }))
})

const layerSchema = v.object({ id: v.string(), name: v.string() })

const pageTreeSchema = v.object({
  children: v.array(v.object({ id: v.string(), name: v.string() }))
})

type AutomationCall = v.InferOutput<typeof callSchema>

/** One MCP session per test. The id is what the server forwards on `args.agent`. */
let sessionSerial = 0
let sessionName = 'session-0'

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

/** Undo and redo open no document. An editor change on the front tab is refused; an empty history applies nothing. */
async function expectNoDocumentChange(command: 'undo' | 'redo', count: number): Promise<void> {
  try {
    const outcome = await settle(request(command))
    const applied = v.safeParse(v.object({ applied: v.boolean() }), outcome.result)
    expect(applied.success && applied.output.applied).toBe(false)
  } catch (error) {
    if (!(error instanceof Error)) throw error
  }
  expect(tabCount()).toBe(count)
  expect(documentTabs()).toHaveLength(0)
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
  sessionName = `session-${sessionSerial}`
  vi.spyOn(layoutModule, 'computeAllLayouts').mockReturnValue(undefined)
  createHomeTab()
  // App tests share one process, and the tab list is module state.
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
  forgetSessionDocument(sessionName)
  forgetSessionDocument('session-b')
  forgetSessionDocument('session-next')
  endAgentSession('anonymous')
  endAgentSession('cli')
})

describe('an edit with no document while Home is in front', () => {
  test('opens a document tab and leaves Home in front', async () => {
    // This file is not the first in the shared app process, so earlier tests leave document tabs.
    for (const tab of getTabsSnapshot()) {
      if (tab.kind !== 'home') await closeTab(tab.id, 'discard')
    }
    const home = homeTab()
    const id = await createRectangle('Card')

    expect(getActiveTabId()).toBe(home.id)
    expect(home.store.graph.getNode(id)).toBeUndefined()
    const documents = documentTabs()
    expect(documents).toHaveLength(1)
    expect(documents[0]?.store.graph.getNode(id)).toBeDefined()
    expect(tabCount()).toBe(2)
  })

  test('reads the layer back from that document', async () => {
    const home = homeTab()
    const id = await createRectangle('Card')

    const node = await settle(request('tool', { name: 'get_node', args: { id } }))
    const tree = await settle(request('tool', { name: 'get_page_tree', args: {} }))
    // A missing layer is a failed tool result. Exporting draws the layer's document offscreen,
    // so it also shows the id was on that document's page.
    const image = settle(request('tool', { name: 'export_image', args: { ids: [id] } }))

    expect(node.ok).toBe(true)
    expect(layerOf(node.result)).toEqual({ id, name: 'Card' })
    expect(node.target?.documentId).toBe(windowDocumentId(documentTabs()[0]?.id ?? ''))
    expect(node.target?.documentId).not.toBe(windowDocumentId(home.id))
    const children = v.safeParse(pageTreeSchema, tree.result)
    expect(
      tree.ok && children.success && children.output.children.some((child) => child.id === id)
    ).toBe(true)
    await expect(image).resolves.toMatchObject({ ok: true })
    expect(tabCount()).toBe(2)
  })

  test('keeps later edits on that same document after the person returns to Home', async () => {
    const home = homeTab()
    const first = await createRectangle('Card')
    const document = documentTabs()[0]
    if (!document) throw new Error('The edit opened no document')
    switchTab(document.id)
    switchTab(home.id)

    const second = await createRectangle('Follow-up')

    expect(getActiveTabId()).toBe(home.id)
    expect(documentTabs()).toHaveLength(1)
    expect(document.store.graph.getNode(first)).toBeDefined()
    expect(document.store.graph.getNode(second)).toBeDefined()
    expect(home.store.graph.getNode(second)).toBeUndefined()
  })

  test('stays on the document that session edited after the person opens another', async () => {
    const home = homeTab()
    const id = await createRectangle('Card')
    const agentDocument = documentTabs()[0]
    if (!agentDocument) throw new Error('The edit opened no document')
    const person = createTab()
    switchTab(home.id)

    const read = await settle(request('tool', { name: 'get_node', args: { id } }))
    const followUp = await createRectangle('Follow-up')

    expect(read.ok).toBe(true)
    expect(layerOf(read.result).id).toBe(id)
    expect(read.target?.documentId).toBe(windowDocumentId(agentDocument.id))
    expect(person.store.graph.getNode(followUp)).toBeUndefined()
    expect(agentDocument.store.graph.getNode(followUp)).toBeDefined()
    expect(home.store.graph.getNode(followUp)).toBeUndefined()
  })

  test('keeps a second edit on that same document without switching tabs', async () => {
    const home = homeTab()
    const first = await createRectangle('Card')
    const second = await createRectangle('Follow-up')

    expect(getActiveTabId()).toBe(home.id)
    expect(documentTabs()).toHaveLength(1)
    const document = documentTabs()[0]
    expect(document?.store.graph.getNode(first)).toBeDefined()
    expect(document?.store.graph.getNode(second)).toBeDefined()
    expect(home.store.graph.getNode(second)).toBeUndefined()
  })

  test('does not open a document for a read', async () => {
    const count = tabCount()
    await settle(request('tool', { name: 'get_selection', args: {} }))
    await settle(request('list_documents'))
    expect(tabCount()).toBe(count)
    expect(documentTabs()).toHaveLength(0)
  })

  test('does not open a document for a view change, undo, or a refused call', async () => {
    const home = homeTab()
    const page = home.store.graph.getNode(home.store.state.currentPageId)
    if (page?.type !== 'CANVAS') throw new Error('Home has no page')
    const count = tabCount()

    await settle(request('tool', { name: 'switch_page', args: { page: page.name } }))
    expect(tabCount()).toBe(count)
    await settle(request('tool', { name: 'viewport_set', args: { x: 0, y: 0, zoom: 1 } }))
    expect(tabCount()).toBe(count)
    await settle(request('tool', { name: 'viewport_zoom_to_fit', args: { ids: [page.id] } }))
    expect(tabCount()).toBe(count)
    await expectNoDocumentChange('undo', count)
    await expectNoDocumentChange('redo', count)

    await expect(settle(request('tool', { name: 'select_nodes', args: {} }))).rejects.toThrow()
    expect(tabCount()).toBe(count)
    await expect(
      settle(request('tool', { name: 'create_shape', args: { type: 'RECTANGLE' } }))
    ).rejects.toThrow()
    expect(tabCount()).toBe(count)
    await expect(settle(request('tool', { name: 'not_a_tool', args: {} }))).rejects.toThrow()
    expect(tabCount()).toBe(count)
    expect(documentTabs()).toHaveLength(0)
    expect(getActiveTabId()).toBe(home.id)
  })

  test('undoes the document from Home and does not open another', async () => {
    const home = homeTab()
    const id = await createRectangle('Card')

    const undone = await settle(request('undo'))
    const applied = v.safeParse(v.object({ applied: v.boolean() }), undone.result)

    expect(applied.success && applied.output.applied).toBe(true)
    expect(getActiveTabId()).toBe(home.id)
    expect(documentTabs()).toHaveLength(1)
    expect(documentTabs()[0]?.store.graph.getNode(id)).toBeUndefined()
  })

  test('does not switch the open document while Home stays in front', async () => {
    const editor = vi.spyOn(activeStore, 'setActiveEditorStore')
    const bridge = vi.spyOn(browserBridge, 'setPairdrawStore')

    await createRectangle('Card')

    expect(editor).not.toHaveBeenCalled()
    expect(bridge).not.toHaveBeenCalled()
    expect(documentTabs()).toHaveLength(1)
  })

  test('puts a page snapshot on the document tab', async () => {
    const home = homeTab()
    browserState.open = true
    browserState.url = 'https://example.com/'
    const editors: object[] = []
    vi.spyOn(browserCommand, 'createBrowserNode').mockImplementation((editor) => {
      editors.push(editor)
      return Promise.resolve({ ok: true, id: 'snapshot-layer' })
    })
    try {
      const reply = await settle(
        handleBrowserSnapshot(
          getActiveStore(),
          { agent: { session: sessionName, kind: 'mcp', client: 'test' } },
          true
        ).then(parseCall)
      )
      const editor = editors[0]
      expect(reply.ok).toBe(true)
      expect(editor).toBeDefined()
      expect(editor).not.toBe(home.store)
      expect(documentTabs().some((tab) => tab.store === editor)).toBe(true)
      expect(home.store.graph.getNode('snapshot-layer')).toBeUndefined()
      expect(getActiveTabId()).toBe(home.id)
    } finally {
      browserState.open = false
      browserState.url = null
    }
  })

  test('a closed desktop window does not open a document for a snapshot', async () => {
    browserState.open = false
    const count = tabCount()
    try {
      await expect(
        settle(
          handleBrowserSnapshot(
            getActiveStore(),
            { agent: { session: sessionName, kind: 'mcp', client: 'test' } },
            true
          )
        )
      ).rejects.toThrow()
      expect(tabCount()).toBe(count)
      expect(documentTabs()).toHaveLength(0)
    } finally {
      browserState.url = null
    }
  })

  test('leaves a New file tab in front and writes to a document tab', async () => {
    const fresh = openNewFileTab()
    const id = await createRectangle('Card')

    expect(getActiveTabId()).toBe(fresh.id)
    expect(fresh.kind).toBe('new-file')
    expect(fresh.store.graph.getNode(id)).toBeUndefined()
    expect(documentTabs().some((tab) => tab.store.graph.getNode(id))).toBe(true)
  })

  test('keeps each session on the document that session edited', async () => {
    const home = homeTab()
    const first = await createRectangle('Card')
    const sessionA = documentTabs()[0]
    if (!sessionA) throw new Error('The edit opened no document')
    const person = createTab()
    switchTab(home.id)

    const second = await createRectangle('Other', 'session-b')

    expect(documentTabs()).toHaveLength(3)
    expect(sessionA.store.graph.getNode(first)).toBeDefined()
    expect(sessionA.store.graph.getNode(second)).toBeUndefined()
    expect(person.store.graph.getNode(second)).toBeUndefined()
    const other = documentTabs().find((tab) => tab.store.graph.getNode(second))
    expect(other).toBeDefined()
    expect(other?.id).not.toBe(sessionA.id)
    const read = await settle(request('tool', { name: 'get_node', args: { id: first } }))
    expect(read.ok).toBe(true)
    expect(read.target?.documentId).toBe(windowDocumentId(sessionA.id))
  })

  test('does not close or save a document the session did not open', async () => {
    const home = homeTab()
    const person = createTab()
    switchTab(home.id)

    const closed = await refusal(settle(request('close_file', { unsaved: 'discard' })))
    const saved = await refusal(settle(request('save_file')))

    expect(closed.reason).toBe('not-owned')
    expect(saved.reason).toBe('not-owned')
    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
  })

  test('closes the document the session opened and leaves another document open', async () => {
    await createRectangle('Card')
    const agent = documentTabs()[0]
    if (!agent) throw new Error('The edit opened no document')
    const person = createTab()
    switchTab(homeTab().id)

    const closed = await settle(request('close_file', { unsaved: 'discard' }))

    expect(closed.ok).toBe(true)
    expect(getTabsSnapshot().some((tab) => tab.id === agent.id)).toBe(false)
    expect(getTabsSnapshot().some((tab) => tab.id === person.id)).toBe(true)
  })

  test('fails after the person closes the session document and opens nothing', async () => {
    const home = homeTab()
    const id = await createRectangle('Card')
    const agent = documentTabs()[0]
    if (!agent) throw new Error('The edit opened no document')
    await closeTab(agent.id, 'discard')

    const read = await refusal(settle(request('tool', { name: 'get_node', args: { id } })))
    const fill = await refusal(
      settle(request('tool', { name: 'set_fill', args: { id, color: '#112233' } }))
    )
    const again = await refusal(
      settle(
        request('tool', {
          name: 'create_shape',
          args: { type: 'RECTANGLE', x: 0, y: 0, width: 10, height: 10 }
        })
      )
    )

    expect(read.reason).toBe('closed')
    expect(fill.reason).toBe('closed')
    expect(again.reason).toBe('closed')
    expect(documentTabs()).toHaveLength(0)
    expect(getActiveTabId()).toBe(home.id)
  })

  test('does not offer Home as a document an agent can edit', async () => {
    const home = homeTab()
    const page = home.store.graph.getNode(home.store.state.currentPageId)
    if (page?.type !== 'CANVAS') throw new Error('Home has no page')
    const before = page.childIds.length
    const listed = await settle(request('list_documents'))
    const documents = v.safeParse(
      v.object({ documents: v.array(v.object({ id: v.string() })) }),
      listed.result
    )

    expect(listed.ok && documents.success).toBe(true)
    if (!documents.success) throw new Error('The list had no documents')
    expect(
      documents.output.documents.some((document) => document.id === windowDocumentId(home.id))
    ).toBe(false)

    const edit = await refusal(
      settle(
        request('tool', {
          document_id: windowDocumentId(home.id),
          name: 'create_shape',
          args: { type: 'RECTANGLE', x: 0, y: 0, width: 20, height: 20 }
        })
      )
    )

    expect(edit.reason).toBe('not-writable')
    expect(home.store.graph.getNode(page.id)?.childIds.length).toBe(before)
    expect(documentTabs()).toHaveLength(0)
  })

  test('does not leave a document when the layer it names is missing', async () => {
    const count = tabCount()
    const outcome = await settle(
      request('tool', { name: 'set_fill', args: { id: '0:999', color: '#112233' } })
    ).then(
      (result) => result,
      (error: unknown) => {
        if (!(error instanceof Error)) throw error
        return { ok: false as const }
      }
    )

    expect(outcome.ok).toBe(false)
    expect(tabCount()).toBe(count)
    expect(documentTabs()).toHaveLength(0)
  })

  test('refuses WebMCP while Home is in front', async () => {
    const home = homeTab()
    const id = await createRectangle('Card')
    const agent = documentTabs()[0]
    if (!agent) throw new Error('The edit opened no document')

    await expect(Promise.resolve().then(() => requireWebMCPDocument(home.store))).rejects.toThrow()

    expect(agent.store.graph.getNode(id)).toBeDefined()
    expect(documentTabs()).toHaveLength(1)
    expect(getActiveTabId()).toBe(home.id)
  })

  test('opens a document for eval only when the script changes one', async () => {
    const home = homeTab()
    const count = tabCount()
    const read = await settle(request('eval', { code: 'return 1' }))
    expect(read.ok).toBe(true)
    expect(tabCount()).toBe(count)
    expect(documentTabs()).toHaveLength(0)

    await expect(
      settle(request('tool', { name: 'script', args: { action: 'run', id: '0:1' } }))
    ).rejects.toThrow()
    expect(documentTabs()).toHaveLength(0)

    const wrote = await settle(
      request('eval', {
        code: 'const node = figma.createRectangle(); node.name = "Made"; return node.id'
      })
    )
    const id = typeof wrote.result === 'string' ? wrote.result : ''

    expect(wrote.ok).toBe(true)
    expect(documentTabs()).toHaveLength(1)
    expect(home.store.graph.getNode(id)).toBeUndefined()
    expect(documentTabs()[0]?.store.graph.getNode(id)?.name).toBe('Made')
    expect(wrote.target?.documentId).toBe(windowDocumentId(documentTabs()[0]?.id ?? ''))
  })

  test('a script that changes nothing reports no document', async () => {
    const read = await settle(request('eval', { code: 'return 1' }))

    expect(read.ok).toBe(true)
    expect(read.target).toBeUndefined()
    expect(documentTabs()).toHaveLength(0)
  })
})
