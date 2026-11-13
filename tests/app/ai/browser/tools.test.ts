import 'fake-indexeddb/auto'
import { afterEach, describe, expect, spyOn, test } from 'bun:test'

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { toRaw } from 'vue'

import { FigmaAPI } from '@open-pencil/core/figma-api'

import { currentPermission, respondToPermission } from '@/app/ai/agents/acp/permission'
import {
  BROWSER_CANNOT_MARK,
  BROWSER_CHAT_TOOL_NAMES,
  BROWSER_PAGE_MOVED,
  createBrowserChatTools,
  runBrowserAction,
  runBrowserLoad,
  runBrowserMark,
  runBrowserRead,
  runBrowserScreenshot,
  type BrowserChatActions
} from '@/app/ai/browser/tools'
import { approveActions } from '@/app/ai/chat/preferences'
import { parseElementMark } from '@/app/ai/chat/references/element'
import { findReferences } from '@/app/ai/chat/references/link'
import { ACTION_DECLINED, createActionApproval } from '@/app/ai/tools/approval'
import { aiToolOverrides } from '@/app/ai/tools/preferences'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { BROWSER_READ_UNREADABLE, BROWSER_SELECTOR_TOO_LONG } from '@/app/browser/read'
import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED } from '@/app/browser/tools'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
const page = { open: true, url: 'https://example.com/docs' }
const READING =
  '{"tag":"button","role":"button","text":"Go","box":{"x":1,"y":2,"width":3,"height":4}}'

function standIn(patch: Partial<BrowserChatActions> = {}): BrowserChatActions {
  const base: BrowserChatActions = {
    page: () => page,
    act: async () => '{"code":"ok"}',
    readElement: async () => READING,
    readOutline: async () => '{"headings":[],"links":[],"buttons":[],"inputs":[]}',
    screenshot: async () => new Uint8Array(8),
    placeScreenshot: async () => undefined,
    navigate: async () => undefined
  }
  return { ...base, ...patch }
}

const click: Parameters<typeof runBrowserAction>[6] = {
  kind: 'click',
  selector: '#go',
  text: '',
  key: '',
  dx: 0,
  dy: 0
}

afterEach(() => {
  appPreferences.value = structuredClone(savedPreferences)
})

function textStop(delta: string) {
  return {
    stream: simulateReadableStream({
      initialDelayInMs: null,
      chunkDelayInMs: null,
      chunks: [
        { type: 'text-start' as const, id: 'reply' },
        { type: 'text-delta' as const, id: 'reply', delta },
        { type: 'text-end' as const, id: 'reply' },
        {
          type: 'finish' as const,
          finishReason: { unified: 'stop' as const, raw: undefined },
          usage: MOCK_USAGE
        }
      ]
    })
  }
}

async function sendTurn(input: {
  model: MockLanguageModelV4
  actions: BrowserChatActions
  offerBrowserTools?: boolean
  chatId: string
  text: string
}): Promise<{ offered: string[]; transcript: string }> {
  const previousTools = aiToolOverrides.value
  const store = createEditorStore()
  const factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation(
    (editor) => new FigmaAPI(editor.graph)
  )
  try {
    aiToolOverrides.value = {}
    const transport = createToolLoopTransport({
      store,
      providerID: 'openai',
      model: input.model,
      effectiveModelID: 'test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      ...(input.offerBrowserTools === undefined
        ? {}
        : { offerBrowserTools: input.offerBrowserTools }),
      browserActions: input.actions
    })
    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      chatId: input.chatId,
      messageId: undefined,
      abortSignal: undefined,
      messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: input.text }] }]
    })
    const reader = stream.getReader()
    const lines: string[] = []
    try {
      for (let next = await reader.read(); !next.done; next = await reader.read()) {
        lines.push(JSON.stringify(next.value))
        expect(next.value.type).not.toBe('error')
      }
    } finally {
      reader.releaseLock()
    }
    const offered = (input.model.doStreamCalls[0]?.tools ?? []).map((entry) => entry.name)
    return { offered, transcript: lines.join('\n') }
  } finally {
    aiToolOverrides.value = previousTools
    factory.mockRestore()
    store.dispose()
  }
}

describe('page actions in the chat', () => {
  test('a browser build refuses without touching the page', async () => {
    let calls = 0
    const approval = createActionApproval({ chatId: 'chat-1' })
    const result = await runBrowserAction(
      false,
      approval,
      standIn({
        act: async () => {
          calls += 1
          return '{"code":"ok"}'
        }
      }),
      'browser_click',
      'call-1',
      { selector: '#go' },
      click
    )
    expect(result).toEqual({ error: BROWSER_DESKTOP_ONLY })
    expect(calls).toBe(0)
  })

  test('a closed window does not ask, and a declined action does not run', async () => {
    approveActions.value = true
    let calls = 0
    const approval = createActionApproval({ chatId: 'chat-1' })
    const closed = await runBrowserAction(
      true,
      approval,
      standIn({ page: () => ({ open: false, url: null }) }),
      'browser_click',
      'call-1',
      {},
      click
    )
    expect(closed).toEqual({ error: BROWSER_WINDOW_CLOSED })
    expect(currentPermission.value).toBeNull()

    const pending = runBrowserAction(
      true,
      approval,
      standIn({
        act: async () => {
          calls += 1
          return '{"code":"ok"}'
        }
      }),
      'browser_click',
      'call-2',
      { selector: '#go' },
      click
    )
    await Promise.resolve()
    respondToPermission('reject')
    expect(await pending).toEqual({ error: ACTION_DECLINED })
    expect(calls).toBe(0)
  })

  test('an approved click or screenshot does not run after the page moves, and a load does not run after the window closes', async () => {
    approveActions.value = true
    const approval = createActionApproval({ chatId: 'chat-1' })
    const open = { open: true, url: 'https://example.com/docs' as string | null }
    let clicks = 0
    let shots = 0
    let placed = 0
    let navigations = 0
    const moving = standIn({
      page: () => ({ open: open.open, url: open.url }),
      act: async () => {
        clicks += 1
        return '{"code":"ok"}'
      },
      screenshot: async () => {
        shots += 1
        return new Uint8Array(8)
      },
      placeScreenshot: async () => {
        placed += 1
      },
      navigate: async () => {
        navigations += 1
      }
    })

    const clickPending = runBrowserAction(
      true,
      approval,
      moving,
      'browser_click',
      'call-move',
      { selector: '#go' },
      click
    )
    await Promise.resolve()
    expect(currentPermission.value).not.toBeNull()
    open.url = 'https://other.example/stolen'
    respondToPermission('allow')
    expect(await clickPending).toEqual({ error: BROWSER_PAGE_MOVED })
    expect(clicks).toBe(0)

    open.url = 'https://example.com/docs'
    const shotPending = runBrowserScreenshot(true, approval, moving, 'call-shot', 'visible')
    await Promise.resolve()
    open.url = 'https://other.example/stolen'
    respondToPermission('allow')
    expect(await shotPending).toEqual({ error: BROWSER_PAGE_MOVED })
    expect(shots).toBe(0)
    expect(placed).toBe(0)

    open.url = 'https://example.com/docs'
    const loadPending = runBrowserLoad(
      true,
      approval,
      moving,
      'call-load',
      'https://other.example/path'
    )
    await Promise.resolve()
    open.open = false
    open.url = null
    respondToPermission('allow')
    expect(await loadPending).toEqual({ error: BROWSER_WINDOW_CLOSED })
    expect(navigations).toBe(0)
  })

  test('a timeout ends that call, and the next one still runs', async () => {
    let calls = 0
    const approval = createActionApproval({ chatId: 'chat-1' })
    const act = async () => {
      calls += 1
      if (calls === 1) throw new Error('The action timed out.')
      return '{"code":"ok"}'
    }
    expect(
      await runBrowserAction(true, approval, standIn({ act }), 'browser_click', 'call-1', {}, click)
    ).toEqual({ error: 'The action timed out.' })
    expect(
      await runBrowserAction(true, approval, standIn({ act }), 'browser_click', 'call-2', {}, click)
    ).toEqual({ ok: true })
  })

  test('one turn offers the page action beside the canvas tools and shows it as a step', async () => {
    let calls = 0
    let step = 0
    const model = new MockLanguageModelV4({
      doStream: async () => {
        step += 1
        if (step === 1) {
          return {
            stream: simulateReadableStream({
              initialDelayInMs: null,
              chunkDelayInMs: null,
              chunks: [
                {
                  type: 'tool-call',
                  toolCallId: 'call-1',
                  toolName: 'browser_click',
                  input: '{"selector":"#go"}'
                },
                {
                  type: 'finish',
                  finishReason: { unified: 'tool-calls', raw: undefined },
                  usage: MOCK_USAGE
                }
              ]
            })
          }
        }
        return textStop('Done')
      }
    })
    const { offered, transcript } = await sendTurn({
      model,
      actions: standIn({
        act: async () => {
          calls += 1
          return '{"code":"ok"}'
        }
      }),
      offerBrowserTools: true,
      chatId: 'browser-act',
      text: 'Click go'
    })
    expect(offered).toContain('browser_click')
    expect(offered).toContain('get_selection')
    expect(calls).toBe(1)
    expect(transcript).toContain('browser_click')
  })

  test('a reading is checked text, and a browser build does not read', async () => {
    let reads = 0
    const refused = await runBrowserRead(
      false,
      standIn({
        readElement: async () => {
          reads += 1
          return READING
        }
      }),
      { kind: 'element', selector: '#go' }
    )
    expect(refused).toEqual({ error: BROWSER_DESKTOP_ONLY })
    expect(reads).toBe(0)

    const bad = await runBrowserRead(
      true,
      standIn({ readElement: async () => '{"html":"<b>no</b>"}' }),
      { kind: 'element', selector: '#go' }
    )
    expect(bad).toEqual({ error: BROWSER_READ_UNREADABLE })

    const outline = await runBrowserRead(
      true,
      standIn({
        readOutline: async () => '{"headings":[],"links":[],"buttons":[],"inputs":[]}'
      }),
      { kind: 'outline' }
    )
    expect(outline).toMatchObject({ untrustedPageText: true, headings: [] })
  })

  test('a mark stores the open page and does nothing with a selector that cannot be stored', async () => {
    const marked = await runBrowserMark(true, standIn(), '#go', 'Go')
    const link = 'mark' in marked ? marked.mark : ''
    const found = findReferences(link)
    expect(found).toHaveLength(1)
    expect(found[0]?.reference).toMatchObject({ kind: 'element', label: 'Go' })
    expect(parseElementMark(found[0]?.reference.id ?? '')).toEqual({
      url: 'https://example.com/docs',
      selector: '#go'
    })
    expect(await runBrowserMark(true, standIn(), 'a'.repeat(501), 'Go')).toEqual({
      error: BROWSER_SELECTOR_TOO_LONG
    })
    expect(await runBrowserMark(true, standIn(), '#go', '')).toEqual({ error: BROWSER_CANNOT_MARK })
  })

  test('a screenshot waits for approval, and a refused address does not move the window', async () => {
    approveActions.value = true
    let placed = 0
    let moved = ''
    const approval = createActionApproval({ chatId: 'chat-1' })
    const actions = standIn({
      placeScreenshot: async () => {
        placed += 1
      },
      navigate: async (url) => {
        moved = url
      }
    })
    const shot = runBrowserScreenshot(true, approval, actions, 'call-1', 'visible')
    await Promise.resolve()
    expect(placed).toBe(0)
    expect(currentPermission.value?.description).toContain('example.com')
    respondToPermission('allow')
    expect(await shot).toEqual({ placed: true })
    expect(placed).toBe(1)

    const refused = await runBrowserLoad(true, approval, actions, 'call-2', 'about:blank')
    expect(refused).toEqual({ error: 'The browser opens http and https addresses only.' })
    expect(currentPermission.value).toBeNull()
    expect(moved).toBe('')

    const pending = runBrowserLoad(true, approval, actions, 'call-3', 'https://other.example/path')
    await Promise.resolve()
    expect(moved).toBe('')
    expect(currentPermission.value?.description).toContain('other.example')
    respondToPermission('reject')
    expect(await pending).toEqual({ error: ACTION_DECLINED })
    expect(moved).toBe('')
  })

  test('every page tool says page text is untrusted', () => {
    const tools = createBrowserChatTools({
      desktop: true,
      approval: createActionApproval({ chatId: 'chat-1' }),
      actions: standIn()
    })
    for (const name of BROWSER_CHAT_TOOL_NAMES) {
      expect(tools[name]?.description).toContain('untrusted')
    }
  })

  test('one turn reads an element, marks it, and places a screenshot beside the canvas tools', async () => {
    const read: string[] = []
    let placed = ''
    let step = 0
    const model = new MockLanguageModelV4({
      doStream: async () => {
        step += 1
        if (step === 1) {
          return {
            stream: simulateReadableStream({
              initialDelayInMs: null,
              chunkDelayInMs: null,
              chunks: [
                {
                  type: 'tool-call',
                  toolCallId: 'call-read',
                  toolName: 'browser_read_element',
                  input: '{"selector":"#go"}'
                },
                {
                  type: 'tool-call',
                  toolCallId: 'call-mark',
                  toolName: 'browser_mark',
                  input: '{"selector":"#go","label":"Go"}'
                },
                {
                  type: 'tool-call',
                  toolCallId: 'call-shot',
                  toolName: 'browser_screenshot_to_canvas',
                  input: '{"kind":"visible"}'
                },
                {
                  type: 'finish',
                  finishReason: { unified: 'tool-calls', raw: undefined },
                  usage: MOCK_USAGE
                }
              ]
            })
          }
        }
        return textStop('Done')
      }
    })
    const { offered, transcript } = await sendTurn({
      model,
      actions: standIn({
        readElement: async (selector) => {
          read.push(selector)
          return READING
        },
        placeScreenshot: async (png, name) => {
          placed = png.byteLength === 8 ? name : ''
        }
      }),
      offerBrowserTools: true,
      chatId: 'browser-turn',
      text: 'Read the button, mark it, and place the view'
    })
    expect(offered).toContain('browser_read_element')
    expect(offered).toContain('browser_mark')
    expect(offered).toContain('browser_screenshot_to_canvas')
    expect(offered).toContain('browser_click')
    expect(offered).toContain('get_selection')
    expect(read).toEqual(['#go'])
    expect(placed).toBe('View')
    const marks = findReferences(transcript).filter((match) => match.reference.kind === 'element')
    expect(marks).toHaveLength(1)
    expect(parseElementMark(marks[0]?.reference.id ?? '')).toEqual({
      url: 'https://example.com/docs',
      selector: '#go'
    })
    expect(transcript).toContain('untrustedPageText')
  })

  test('the browser build does not offer the page tools', async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => textStop('Done')
    })
    const { offered } = await sendTurn({
      model,
      actions: standIn(),
      chatId: 'browser-hidden',
      text: 'Hello'
    })
    expect(offered).not.toContain('browser_read_element')
    expect(offered).not.toContain('browser_click')
    expect(offered).toContain('get_selection')
  })
})
