import 'fake-indexeddb/auto'
import { expect, spyOn, test } from 'bun:test'

import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { toRaw } from 'vue'

import { FigmaAPI } from '@pairdraw/core/figma-api'

import { runUndoEntries } from '@/app/ai/reply/run'
import { aiToolOverrides } from '@/app/ai/tools/preferences'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import * as figmaFactory from '@/app/automation/bridge/figma-factory'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'

type EditorStore = ReturnType<typeof createEditorStore>
type Chunk =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer C>
    ? C
    : never

/** A model that plays the given chunks per request, then stops. */
function scriptedModel(chunksPerCall: Chunk[][]) {
  let call = 0
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream<Chunk>({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: chunksPerCall[Math.min(call++, chunksPerCall.length - 1)] ?? []
      })
    })
  })
}

function textChunks(text: string): Chunk[] {
  return [
    { type: 'text-start' as const, id: 't' },
    { type: 'text-delta' as const, id: 't', delta: text },
    { type: 'text-end' as const, id: 't' },
    {
      type: 'finish' as const,
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: MOCK_USAGE
    }
  ]
}

function toolChunks(toolName: string, input: string, id = 'call-1'): Chunk[] {
  return [
    { type: 'tool-call' as const, toolCallId: id, toolName, input },
    {
      type: 'finish' as const,
      finishReason: { unified: 'tool-calls' as const, raw: undefined },
      usage: MOCK_USAGE
    }
  ]
}

async function send(
  store: EditorStore,
  model: MockLanguageModelV4,
  chatId: string,
  abortSignal?: AbortSignal
) {
  const transport = createToolLoopTransport({
    store,
    providerID: 'openai',
    model,
    effectiveModelID: 'test',
    maxOutputTokens: 100,
    thinkingLevel: () => 'default'
  })
  const stream = await transport.sendMessages({
    trigger: 'submit-message',
    chatId,
    messageId: undefined,
    abortSignal,
    messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Go' }] }]
  })
  const reader = stream.getReader()
  let text = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (
        value &&
        typeof value === 'object' &&
        'delta' in value &&
        typeof value.delta === 'string'
      ) {
        text += value.delta
      }
    }
  } finally {
    reader.releaseLock()
  }
  return text
}

async function withStore(check: (store: EditorStore) => Promise<void>) {
  const previousPreferences = structuredClone(toRaw(appPreferences.value))
  const previousTools = aiToolOverrides.value
  const store = createEditorStore()
  const factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation((editor, pageId) => {
    const api = new FigmaAPI(editor.graph)
    api.currentPage = api.wrapNode(pageId ?? editor.state.currentPageId)
    return api
  })
  store.preparationController.acknowledgePresentation(Number.MAX_SAFE_INTEGER)
  try {
    aiToolOverrides.value = { create_shape: true }
    await check(store)
  } finally {
    appPreferences.value = previousPreferences
    aiToolOverrides.value = previousTools
    factory.mockRestore()
    store.dispose()
  }
}

test('a turn that edits twice records both edits for that turn', async () => {
  await withStore(async (store) => {
    const page = store.state.currentPageId
    const model = scriptedModel([
      toolChunks(
        'create_shape',
        JSON.stringify({ type: 'RECTANGLE', x: 0, y: 0, width: 10, height: 10 }),
        'call-1'
      ),
      toolChunks(
        'create_shape',
        JSON.stringify({ type: 'RECTANGLE', x: 20, y: 0, width: 10, height: 10 }),
        'call-2'
      ),
      textChunks('Done')
    ])
    await send(store, model, 'one-step')
    expect(store.graph.getChildren(page)).toHaveLength(2)
    expect(runUndoEntries(store)).toHaveLength(2)
    store.undo.undo()
    store.undo.undo()
    expect(store.graph.getChildren(page)).toHaveLength(0)
  })
})

test('a tool call with malformed arguments reports an error and edits nothing', async () => {
  await withStore(async (store) => {
    const page = store.state.currentPageId
    const model = scriptedModel([
      toolChunks('create_shape', '{"type":', 'call-bad'),
      textChunks('Could not run that.')
    ])
    await send(store, model, 'malformed')
    expect(store.graph.getChildren(page)).toHaveLength(0)
    expect(runUndoEntries(store)).toHaveLength(0)
  })
})

test('a very long reply is kept whole', async () => {
  await withStore(async (store) => {
    const long = 'x'.repeat(200_000)
    const model = scriptedModel([textChunks(long)])
    const text = await send(store, model, 'long')
    expect(text.length).toBe(200_000)
  })
})

test('two chats run at once without sharing their turn', async () => {
  await withStore(async (store) => {
    const page = store.state.currentPageId
    const first = scriptedModel([
      toolChunks(
        'create_shape',
        JSON.stringify({ type: 'RECTANGLE', x: 0, y: 0, width: 10, height: 10 }),
        'a-1'
      ),
      textChunks('First done')
    ])
    const second = scriptedModel([
      toolChunks(
        'create_shape',
        JSON.stringify({ type: 'RECTANGLE', x: 40, y: 0, width: 10, height: 10 }),
        'b-1'
      ),
      textChunks('Second done')
    ])
    const [one, two] = await Promise.all([
      send(store, first, 'chat-a'),
      send(store, second, 'chat-b')
    ])
    expect(one).toBe('First done')
    expect(two).toBe('Second done')
    expect(store.graph.getChildren(page)).toHaveLength(2)
  })
})

test('stopping mid-stream ends the reply without a failure', async () => {
  await withStore(async (store) => {
    const controller = new AbortController()
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream<Chunk>({
          initialDelayInMs: null,
          chunkDelayInMs: 20,
          chunks: [
            { type: 'text-start' as const, id: 't' },
            { type: 'text-delta' as const, id: 't', delta: 'thinking' },
            { type: 'text-delta' as const, id: 't', delta: ' more' },
            {
              type: 'finish' as const,
              finishReason: { unified: 'stop' as const, raw: undefined },
              usage: MOCK_USAGE
            }
          ]
        })
      })
    })
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const pending = send(store, model, 'stopped', controller.signal)
      setTimeout(() => controller.abort(), 30)
      await pending
      await new Promise((resolve) => {
        setTimeout(resolve, 50)
      })
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})

test('a document disposed while a tool runs does not leave a rejection behind', async () => {
  await withStore(async () => {
    const store = createEditorStore()
    const factory = spyOn(figmaFactory, 'makeFigmaFromStore').mockImplementation(
      (editor, pageId) => {
        const api = new FigmaAPI(editor.graph)
        api.currentPage = api.wrapNode(pageId ?? editor.state.currentPageId)
        return api
      }
    )
    const model = scriptedModel([
      toolChunks(
        'create_shape',
        JSON.stringify({ type: 'RECTANGLE', x: 0, y: 0, width: 10, height: 10 }),
        'close-1'
      ),
      textChunks('Done')
    ])
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      const pending = send(store, model, 'closed')
      setTimeout(() => store.dispose(), 5)
      await pending.catch(() => undefined)
      await new Promise((resolve) => {
        setTimeout(resolve, 50)
      })
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
      factory.mockRestore()
    }
  })
})
