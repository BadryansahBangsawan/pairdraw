import 'fake-indexeddb/auto'
import { describe, expect, test } from 'bun:test'

import {
  readUIMessageStream,
  simulateReadableStream,
  type UIMessage,
  type UIMessageChunk
} from 'ai'
import { MockLanguageModelV4 } from 'ai/test'

import { createUpdateMapper } from '@/app/ai/agents/acp/events'
import { latestContextUsage } from '@/app/ai/chat/context-window/usage'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import { createEditorStore } from '@/app/editor/session/create'

/** The reply a chat builds from a stream of chunks. */
async function replyOf(stream: ReadableStream<UIMessageChunk>): Promise<UIMessage> {
  let message: UIMessage | undefined
  for await (const next of readUIMessageStream({ stream })) message = next
  if (!message) throw new Error('The stream built no reply')
  return message
}

function streamOf(chunks: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    }
  })
}

describe('what fills the context meter', () => {
  test("an ACP agent's usage update reaches its reply", async () => {
    const mapper = createUpdateMapper('turn')
    const chunks: UIMessageChunk[] = [
      { type: 'start' },
      { type: 'start-step' },
      ...mapper.map({
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Done' }
      }),
      ...mapper.map({ sessionUpdate: 'usage_update', used: 52_000, size: 200_000 }),
      ...mapper.end(),
      { type: 'finish-step' },
      { type: 'finish', finishReason: 'stop' }
    ]
    const reply = await replyOf(streamOf(chunks))
    expect(latestContextUsage([reply])).toEqual({ usedTokens: 52_000, windowTokens: 200_000 })
  })

  test("a built-in model's step usage reaches its reply", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
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
              usage: {
                inputTokens: { total: 1200, noCache: 200, cacheRead: 1000, cacheWrite: undefined },
                outputTokens: { total: 300, text: 300, reasoning: undefined }
              }
            }
          ]
        })
      })
    })
    const store = createEditorStore()
    try {
      const transport = createToolLoopTransport({
        store,
        providerID: 'anthropic',
        model,
        effectiveModelID: 'claude-test',
        maxOutputTokens: 100,
        thinkingLevel: () => 'default'
      })
      const stream = await transport.sendMessages({
        trigger: 'submit-message',
        chatId: 'context-meter',
        messageId: undefined,
        abortSignal: undefined,
        messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
      })
      const reply = await replyOf(stream)
      expect(latestContextUsage([reply])).toEqual({
        usedTokens: 1500,
        inputTokens: 1200,
        cachedInputTokens: 1000,
        outputTokens: 300,
        firstRequestTokens: 1200
      })
    } finally {
      store.dispose()
    }
  })
})
