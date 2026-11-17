import { expect, test } from 'bun:test'

import { classifyAIChatError } from '@/app/ai/chat/failure'
import { withStallTimeout } from '@/app/ai/transports/stall'

/** A stream that opens at once, then waits before its first token. */
function openingThen(gapMs: number, chunks: unknown[]): ReadableStream<unknown> {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue({ type: 'start' })
      controller.enqueue({ type: 'start-step' })
      controller.enqueue({ type: 'reasoning-start', id: 'reason' })
      await new Promise<void>((resolve) => {
        setTimeout(resolve, gapMs)
      })
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    }
  })
}

async function readChunks(stream: ReadableStream<unknown>): Promise<unknown[]> {
  const reader = stream.getReader()
  const values: unknown[] = []
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) return values
      values.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
}

function chunkType(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('type' in value)) return undefined
  return typeof value.type === 'string' ? value.type : undefined
}

test('the first token keeps the longer wait after the stream has started', async () => {
  const stream = withStallTimeout(
    openingThen(150, [
      { type: 'reasoning-delta', id: 'reason', delta: 'Thinking' },
      { type: 'reasoning-end', id: 'reason' },
      { type: 'text-delta', id: 'reply', delta: 'Done' },
      { type: 'finish' }
    ]),
    // The gap outlasts the quiet period and fits inside the first-token wait.
    { firstChunkMs: 500, chunkMs: 40 }
  )
  const values = await readChunks(stream)
  expect(values.map(chunkType)).toContain('text-delta')
})

test('a first token later than the first-chunk wait still ends the reply', async () => {
  const stream = withStallTimeout(
    openingThen(150, [{ type: 'text-delta', id: 'reply', delta: 'Late' }, { type: 'finish' }]),
    { firstChunkMs: 40, chunkMs: 20 }
  )
  let caught: unknown
  try {
    await readChunks(stream)
  } catch (error) {
    caught = error
  }
  expect(classifyAIChatError(caught).reason).toBe('timeout')
})

test('the next step keeps the longer wait after a tool finishes', async () => {
  const stream = withStallTimeout(
    new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'start-step' })
        controller.enqueue({ type: 'tool-input-available', toolCallId: 'call-1' })
        controller.enqueue({ type: 'tool-output-available', toolCallId: 'call-1' })
        controller.enqueue({ type: 'finish-step' })
        controller.enqueue({ type: 'start-step' })
        controller.enqueue({ type: 'reasoning-start', id: 'reason' })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150)
        })
        controller.enqueue({ type: 'reasoning-delta', id: 'reason', delta: 'Again' })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: 'Done' })
        controller.enqueue({ type: 'finish' })
        controller.close()
      }
    }),
    // The gap outlasts the quiet period and fits inside the first-token wait of the new step.
    { firstChunkMs: 500, chunkMs: 40 }
  )
  const values = await readChunks(stream)
  expect(values.map(chunkType)).toContain('text-delta')
})

test('a next step later than the first-chunk wait still ends the reply', async () => {
  const stream = withStallTimeout(
    new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: 'start-step' })
        controller.enqueue({ type: 'tool-input-available', toolCallId: 'call-1' })
        controller.enqueue({ type: 'tool-output-available', toolCallId: 'call-1' })
        controller.enqueue({ type: 'start-step' })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150)
        })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: 'Late' })
        controller.enqueue({ type: 'finish' })
        controller.close()
      }
    }),
    { firstChunkMs: 40, chunkMs: 20 }
  )
  let caught: unknown
  try {
    await readChunks(stream)
  } catch (error) {
    caught = error
  }
  expect(classifyAIChatError(caught).reason).toBe('timeout')
})

test('a gap after the next step has produced a token still ends the reply', async () => {
  const stream = withStallTimeout(
    new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: 'tool-output-available', toolCallId: 'call-1' })
        controller.enqueue({ type: 'start-step' })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: 'Hi' })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150)
        })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: ' there' })
        controller.enqueue({ type: 'finish' })
        controller.close()
      }
    }),
    { firstChunkMs: 500, chunkMs: 40 }
  )
  let caught: unknown
  try {
    await readChunks(stream)
  } catch (error) {
    caught = error
  }
  expect(classifyAIChatError(caught).reason).toBe('timeout')
})

test('a gap after the first token still ends the reply', async () => {
  const stream = withStallTimeout(
    new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: 'Hi' })
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150)
        })
        controller.enqueue({ type: 'text-delta', id: 'reply', delta: ' there' })
        controller.enqueue({ type: 'finish' })
        controller.close()
      }
    }),
    { firstChunkMs: 500, chunkMs: 40 }
  )
  let caught: unknown
  try {
    await readChunks(stream)
  } catch (error) {
    caught = error
  }
  expect(classifyAIChatError(caught).reason).toBe('timeout')
})
