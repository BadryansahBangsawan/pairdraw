import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'

import { simulateReadableStream } from 'ai'
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import * as v from 'valibot'

import type { TurnUsage } from '@/app/ai/chat/usage/aggregate'
import { turnUsageSchema } from '@/app/ai/chat/usage/schema'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import { createEditorStore } from '@/app/editor/session/create'

const USAGE = {
  inputTokens: { total: 100, noCache: 70, cacheRead: 30, cacheWrite: undefined },
  outputTokens: { total: 40, text: 28, reasoning: 12 }
}

function replyModel() {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: [
          { type: 'text-start', id: 'reply' },
          { type: 'text-delta', id: 'reply', delta: 'Done' },
          { type: 'text-end', id: 'reply' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: USAGE }
        ]
      })
    })
  })
}

async function collect(transport: ChatTransport<UIMessage>): Promise<UIMessageChunk[]> {
  const stream = await transport.sendMessages({
    trigger: 'submit-message',
    chatId: 'usage',
    messageId: undefined,
    abortSignal: undefined,
    messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
  })
  const chunks: UIMessageChunk[] = []
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return chunks
}

function usageMetadata(chunks: UIMessageChunk[]): TurnUsage | null {
  for (const chunk of chunks) {
    const metadata =
      chunk.type === 'message-metadata'
        ? chunk.messageMetadata
        : chunk.type === 'finish'
          ? chunk.messageMetadata
          : undefined
    const usage = v.is(v.record(v.string(), v.unknown()), metadata) ? metadata.usage : undefined
    const parsed = v.safeParse(turnUsageSchema, usage)
    if (parsed.success) return parsed.output
  }
  return null
}

test('a reply carries its token usage in message metadata', async () => {
  const store = createEditorStore()
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model: replyModel(),
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      onError: () => undefined,
      externalMCP: { hold: () => () => undefined, tools: async () => ({}) } as never
    })
    const chunks = await collect(transport)
    expect(usageMetadata(chunks)).toEqual({
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 30,
      reasoningTokens: 12
    })
  } finally {
    store.dispose()
  }
})
