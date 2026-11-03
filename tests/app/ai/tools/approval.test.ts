import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'

import { toRaw } from 'vue'

import { FigmaAPI } from '@open-pencil/core/figma-api'

import {
  currentPermission,
  permissionQueue,
  respondToPermission
} from '@/app/ai/agents/acp/permission'
import { approveActions, changePreviewSize } from '@/app/ai/chat/preferences'
import { createAITools, startRun } from '@/app/ai/tools'
import {
  ACTION_APPROVAL_TIMEOUT_MS,
  ACTION_DECLINED,
  ACTION_UNANSWERED,
  createActionApproval
} from '@/app/ai/tools/approval'
import { aiToolDefinitions } from '@/app/ai/tools/catalog'
import { clearToolChanges } from '@/app/ai/tools/changes/store'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { expectDefined } from '#tests/helpers/assert'

const savedPreferences = structuredClone(toRaw(appPreferences.value))

function definition(name: string) {
  return expectDefined(
    aiToolDefinitions.find((tool) => tool.name === name),
    name
  )
}

/** Lets the request reach the queue, then answers it as the dialog would. */
async function answer(optionId: string): Promise<void> {
  await Promise.resolve()
  respondToPermission(optionId)
}

beforeEach(() => {
  permissionQueue.value = []
})

afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
  permissionQueue.value = []
})

describe('approving the built-in chat’s actions', () => {
  test('is off by default, so calls run without asking', async () => {
    expect(approveActions.value).toBe(false)
    const approval = createActionApproval({ chatId: 'chat-1' })
    expect(await approval.approve(definition('set_fill'), {}, 'call-1')).toBe('allowed')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('asks before a change, in the dialog agents use, and runs it once allowed', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    const pending = approval.approve(definition('set_fill'), { id: '0:1' }, 'call-1')

    const request = expectDefined(currentPermission.value, 'request')
    expect(request.request.toolCall).toMatchObject({ toolCallId: 'call-1', title: 'set_fill' })
    expect(request.request.options.map((option) => option.kind)).toEqual([
      'allow_once',
      'allow_always',
      'reject_once'
    ])
    expect(request.description).toContain('set_fill')
    await answer('allow')
    expect(await pending).toBe('allowed')
  })

  test('never asks before a call that only reads', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    expect(await approval.approve(definition('get_page_tree'), {}, 'call-1')).toBe('allowed')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('“Always allow” covers that tool for the rest of the chat only', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    const first = approval.approve(definition('set_fill'), {}, 'call-1')
    await answer('allow-always')
    expect(await first).toBe('allowed')

    expect(await approval.approve(definition('set_fill'), {}, 'call-2')).toBe('allowed')
    expect(permissionQueue.value).toHaveLength(0)

    const other = createActionApproval({ chatId: 'chat-2' }).approve(
      definition('set_fill'),
      {},
      'call-3'
    )
    expect(permissionQueue.value).toHaveLength(1)
    await answer('reject')
    expect(await other).toBe('declined')
  })

  test('stopping the reply declines what still waits and clears the dialog', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    const pending = approval.approve(definition('set_fill'), {}, 'call-1')
    expect(permissionQueue.value).toHaveLength(1)

    approval.cancelPending()

    expect(await pending).toBe('declined')
    expect(permissionQueue.value).toHaveLength(0)
  })

  test('a request nobody answers waits minutes, then reads as unanswered, not declined', async () => {
    jest.useFakeTimers()
    try {
      approveActions.value = true
      const approval = createActionApproval({ chatId: 'chat-1' })
      const pending = approval.approve(definition('set_fill'), {}, 'call-1')

      // Longer than an agent's request waits.
      jest.advanceTimersByTime(60_000)
      expect(permissionQueue.value).toHaveLength(1)
      jest.advanceTimersByTime(ACTION_APPROVAL_TIMEOUT_MS)

      expect(await pending).toBe('unanswered')
      expect(permissionQueue.value).toHaveLength(0)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('approving an external MCP server’s tools', () => {
  const request = {
    name: 'mcp__files__write_file',
    server: 'Files',
    tool: 'write_file',
    input: { path: 'notes.md' },
    toolCallId: 'call-1',
    readOnly: false
  }

  test('asks before a tool the server does not mark read-only, naming the server', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    const pending = approval.approveExternal(request)

    const asked = expectDefined(currentPermission.value, 'request')
    expect(asked.request.toolCall).toMatchObject({ title: 'mcp__files__write_file' })
    expect(asked.description).toContain('write_file')
    expect(asked.description).toContain('Files')
    await answer('reject')
    expect(await pending).toBe(false)
  })

  test('runs a read-only tool, or any tool while approval is off, without asking', async () => {
    const approval = createActionApproval({ chatId: 'chat-1' })
    expect(await approval.approveExternal(request)).toBe(true)
    approveActions.value = true
    expect(await approval.approveExternal({ ...request, readOnly: true })).toBe(true)
    expect(permissionQueue.value).toHaveLength(0)
  })
})

describe('a declined call in the chat', () => {
  let store: ReturnType<typeof createEditorStore>
  let factory: ReturnType<typeof spyOn>

  beforeEach(() => {
    // No canvas renders here.
    changePreviewSize.value = 'off'
    store = createEditorStore()
    factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation((editor, pageId) => {
      const api = new FigmaAPI(editor.graph)
      api.currentPage = api.wrapNode(pageId ?? editor.state.currentPageId)
      return api
    })
  })

  afterEach(() => {
    factory.mockRestore()
    clearToolChanges()
    store.dispose()
  })

  function setFill(approve: ReturnType<typeof createActionApproval>['approve']) {
    return expectDefined(createAITools(store, undefined, { approve }).set_fill.execute, 'set_fill')
  }

  test('changes nothing and tells the model the person said no', async () => {
    approveActions.value = true
    const card = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Card' })
    const before = structuredClone(toRaw(card.fills))
    startRun(store, 10)
    const tool = setFill(createActionApproval({ chatId: 'chat-1' }).approve)

    const result = tool(
      { id: card.id, color: '#ff0000' },
      { toolCallId: 'call-1', messages: [], context: undefined }
    )
    await answer('reject')

    expect(await result).toEqual({ error: ACTION_DECLINED })
    expect(store.graph.getNode(card.id)?.fills).toEqual(before)
  })

  test('tells the model nobody answered, rather than that the person said no', async () => {
    const card = store.graph.createNode('FRAME', store.state.currentPageId, { name: 'Card' })
    const before = structuredClone(toRaw(card.fills))
    startRun(store, 10)
    const tool = setFill(async () => 'unanswered')

    const result = await tool(
      { id: card.id, color: '#ff0000' },
      { toolCallId: 'call-1', messages: [], context: undefined }
    )

    expect(result).toEqual({ error: ACTION_UNANSWERED })
    expect(store.graph.getNode(card.id)?.fills).toEqual(before)
  })
})
