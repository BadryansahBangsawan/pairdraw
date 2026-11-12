import 'fake-indexeddb/auto'
import { afterEach, describe, expect, spyOn, test } from 'bun:test'

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { toRaw } from 'vue'

import { FigmaAPI } from '@open-pencil/core/figma-api'

import { currentPermission, respondToPermission } from '@/app/ai/agents/acp/permission'
import { runBrowserAction, type BrowserChatActions } from '@/app/ai/browser/tools'
import { approveActions } from '@/app/ai/chat/preferences'
import { ACTION_DECLINED, createActionApproval } from '@/app/ai/tools/approval'
import { aiToolOverrides } from '@/app/ai/tools/preferences'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { BROWSER_DESKTOP_ONLY, BROWSER_WINDOW_CLOSED } from '@/app/browser/tools'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'

const savedPreferences = structuredClone(toRaw(appPreferences.value))
const page = { open: true, url: 'https://example.com/docs' }

function actions(act: BrowserChatActions['act']): BrowserChatActions {
  return { page: () => page, act }
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

describe('page actions in the chat', () => {
  test('a browser build refuses without touching the page', async () => {
    let calls = 0
    const approval = createActionApproval({ chatId: 'chat-1' })
    const result = await runBrowserAction(
      false,
      approval,
      actions(async () => {
        calls += 1
        return '{"code":"ok"}'
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
      { page: () => ({ open: false, url: null }), act: async () => '{"code":"ok"}' },
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
      actions(async () => {
        calls += 1
        return '{"code":"ok"}'
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

  test('a timeout ends that call, and the next one still runs', async () => {
    let calls = 0
    const approval = createActionApproval({ chatId: 'chat-1' })
    const act = async () => {
      calls += 1
      if (calls === 1) throw new Error('The action timed out.')
      return '{"code":"ok"}'
    }
    expect(
      await runBrowserAction(true, approval, actions(act), 'browser_click', 'call-1', {}, click)
    ).toEqual({ error: 'The action timed out.' })
    expect(
      await runBrowserAction(true, approval, actions(act), 'browser_click', 'call-2', {}, click)
    ).toEqual({ ok: true })
  })

  test('one turn offers the page action beside the canvas tools and shows it as a step', async () => {
    const previousTools = aiToolOverrides.value
    const store = createEditorStore()
    const factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation(
      (editor) => new FigmaAPI(editor.graph)
    )
    let calls = 0
    let step = 0
    const seen: string[] = []
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
        return {
          stream: simulateReadableStream({
            initialDelayInMs: null,
            chunkDelayInMs: null,
            chunks: [
              { type: 'text-start', id: 'reply' },
              { type: 'text-delta', id: 'reply', delta: 'Done' },
              { type: 'text-end', id: 'reply' },
              {
                type: 'finish',
                finishReason: { unified: 'stop', raw: undefined },
                usage: MOCK_USAGE
              }
            ]
          })
        }
      }
    })
    try {
      aiToolOverrides.value = {}
      const transport = createToolLoopTransport({
        store,
        providerID: 'openai',
        model,
        effectiveModelID: 'test',
        maxOutputTokens: 100,
        thinkingLevel: () => 'default',
        offerBrowserTools: true,
        browserActions: actions(async () => {
          calls += 1
          return '{"code":"ok"}'
        })
      })
      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'browser-act',
        messageId: undefined,
        abortSignal: undefined,
        messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Click go' }] }]
      })
      const reader = stream.getReader()
      try {
        for (let next = await reader.read(); !next.done; next = await reader.read()) {
          seen.push(JSON.stringify(next.value))
          expect(next.value.type).not.toBe('error')
        }
      } finally {
        reader.releaseLock()
      }
      const offered = (model.doStreamCalls[0]?.tools ?? []).map((entry) => entry.name)
      expect(offered).toContain('browser_click')
      expect(offered).toContain('get_selection')
      expect(calls).toBe(1)
      expect(seen.some((line) => line.includes('browser_click'))).toBe(true)
    } finally {
      aiToolOverrides.value = previousTools
      factory.mockRestore()
      store.dispose()
    }
  })
})
