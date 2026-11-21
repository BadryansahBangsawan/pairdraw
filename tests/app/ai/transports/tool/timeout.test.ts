import 'fake-indexeddb/auto'
import { expect, test } from 'bun:test'

import { dynamicTool, jsonSchema, simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { toRaw } from 'vue'

import {
  permissionQueue,
  rejectCurrentPermission,
  respondToPermission
} from '@/app/ai/agents/acp/permission'
import { classifyAIChatError } from '@/app/ai/chat/failure'
import { approveActions } from '@/app/ai/chat/preferences'
import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

import { MOCK_USAGE } from '#tests/helpers/chat/usage'

type StreamPart =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer Part>
    ? Part
    : never

async function send(transport: ReturnType<typeof createToolLoopTransport>): Promise<void> {
  const stream = await transport.sendMessages({
    trigger: 'submit-message',
    chatId: 'watchdog',
    messageId: undefined,
    abortSignal: undefined,
    messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }]
  })
  const reader = stream.getReader()
  try {
    while (!(await reader.read()).done);
  } finally {
    reader.releaseLock()
  }
}

test('a slow approval does not end the turn before the model continues', async () => {
  const savedPreferences = structuredClone(toRaw(appPreferences.value))
  approveActions.value = true
  permissionQueue.value = []
  const store = createEditorStore()
  let calls = 0
  let markAsked: () => void = () => undefined
  const asked = new Promise<void>((resolve) => {
    markAsked = resolve
  })
  const model = new MockLanguageModelV4({
    doStream: async () => {
      calls++
      const chunks: StreamPart[] =
        calls === 1
          ? [
              {
                type: 'tool-call',
                toolCallId: 'gated-1',
                toolName: 'mcp__test__gated',
                input: '{}'
              },
              {
                type: 'finish',
                finishReason: { unified: 'tool-calls', raw: undefined },
                usage: MOCK_USAGE
              }
            ]
          : [
              { type: 'text-start', id: 'reply' },
              { type: 'text-delta', id: 'reply', delta: 'Done' },
              { type: 'text-end', id: 'reply' },
              {
                type: 'finish',
                finishReason: { unified: 'stop', raw: undefined },
                usage: MOCK_USAGE
              }
            ]
      return {
        stream: simulateReadableStream({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks
        })
      }
    }
  })
  const errors: unknown[] = []
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model,
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      onError: (error) => errors.push(error),
      // Shorter than the approval takes, so a watchdog that also times the wait fails here.
      timeouts: { firstChunkMs: 20, chunkMs: 20 },
      externalMCP: {
        tools: async (request) => {
          const approve = request?.approve
          if (!approve) throw new Error('missing approval')
          return {
            mcp__test__gated: dynamicTool({
              description: 'Waits for Allow or Deny',
              inputSchema: jsonSchema({ type: 'object', properties: {} }),
              execute: async (_input, { toolCallId }) => {
                const pending = approve({
                  name: 'mcp__test__gated',
                  server: 'test',
                  tool: 'gated',
                  input: {},
                  toolCallId,
                  readOnly: false
                })
                markAsked()
                const allowed = await pending
                return { content: [{ type: 'text', text: allowed ? 'ok' : 'no' }] }
              }
            })
          }
        },
        hold: () => () => undefined,
        close: () => undefined
      }
    })
    const finished = send(transport).then(
      () => 'finished' as const,
      () => 'failed' as const
    )
    const first = await Promise.race([asked.then(() => 'asked' as const), finished])
    expect(first).toBe('asked')
    // The approval itself is what outlasts the provider gap.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150)
    })
    respondToPermission('allow')
    expect(await finished).toBe('finished')
    expect(errors).toHaveLength(0)
    expect(calls).toBe(2)
  } finally {
    rejectCurrentPermission()
    appPreferences.value = structuredClone(savedPreferences)
    permissionQueue.value = []
    store.dispose()
  }
})

test('a provider that stalls and then calls a tool is aborted before the tool runs', async () => {
  const store = createEditorStore()
  let executed = false
  let sawAbort = false
  let markSettled: () => void = () => undefined
  const providerSettled = new Promise<void>((resolve) => {
    markSettled = resolve
  })
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      const abortSignal = options.abortSignal
      return {
        stream: new ReadableStream({
          async start(controller) {
            // A live request stops when its signal aborts, the way a fetch does.
            const aborted = new Promise<void>((resolve) => {
              if (abortSignal?.aborted) resolve()
              else abortSignal?.addEventListener('abort', () => resolve(), { once: true })
            })
            if (abortSignal) {
              abortSignal.addEventListener('abort', () => {
                sawAbort = true
              })
            }
            const paused = new Promise<void>((resolve) => {
              setTimeout(resolve, 150)
            })
            const first = await Promise.race([
              aborted.then(() => 'aborted' as const),
              paused.then(() => 'paused' as const)
            ])
            try {
              if (first === 'paused' && !abortSignal?.aborted) {
                controller.enqueue({
                  type: 'tool-call',
                  toolCallId: 'late-1',
                  toolName: 'mcp__test__late',
                  input: '{}'
                })
                controller.enqueue({
                  type: 'finish',
                  finishReason: { unified: 'tool-calls', raw: undefined },
                  usage: MOCK_USAGE
                })
              }
              controller.close()
            } finally {
              markSettled()
            }
          }
        })
      }
    }
  })
  const errors: unknown[] = []
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model,
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      onError: (error) => errors.push(error),
      // Shorter than the pause before the tool call.
      timeouts: { firstChunkMs: 40, chunkMs: 40 },
      externalMCP: {
        tools: async () => ({
          mcp__test__late: dynamicTool({
            description: 'Must not run once the reply has timed out',
            inputSchema: jsonSchema({ type: 'object', properties: {} }),
            execute: async () => {
              executed = true
              return { content: [{ type: 'text', text: 'ran' }] }
            }
          })
        }),
        hold: () => () => undefined,
        close: () => undefined
      }
    })
    await send(transport)
    await providerSettled
    expect(sawAbort).toBe(true)
    expect(executed).toBe(false)
    expect(errors).toHaveLength(1)
    expect(classifyAIChatError(errors[0]).reason).toBe('timeout')
  } finally {
    store.dispose()
  }
})

test('a slow first token keeps the longer wait after the stream starts', async () => {
  const store = createEditorStore()
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        // Longer than the gap between chunks, shorter than the first-token wait.
        initialDelayInMs: 150,
        chunkDelayInMs: null,
        chunks: [
          { type: 'reasoning-start', id: 'reason' },
          { type: 'reasoning-delta', id: 'reason', delta: 'Thinking' },
          { type: 'reasoning-end', id: 'reason' },
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
    })
  })
  const errors: unknown[] = []
  try {
    const transport = createToolLoopTransport({
      store,
      providerID: 'anthropic',
      model,
      effectiveModelID: 'claude-test',
      maxOutputTokens: 100,
      thinkingLevel: () => 'default',
      onError: (error) => errors.push(error),
      timeouts: { firstChunkMs: 500, chunkMs: 40 }
    })
    await send(transport)
    expect(errors).toHaveLength(0)
    expect(model.doStreamCalls).toHaveLength(1)
  } finally {
    store.dispose()
  }
})
