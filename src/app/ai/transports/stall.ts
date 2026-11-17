import type { ProviderTimeouts } from '@/app/ai/transports/timeout'

/** A reply the provider stopped feeding; the person can retry it like any other failure. */
export class ProviderStallError extends Error {
  constructor(waitedMs: number) {
    super(`The provider sent nothing for ${Math.round(waitedMs / 1000)} seconds.`)
    this.name = 'ProviderStallError'
  }
}

type ToolChunk = { type: string; toolCallId?: string }

/** A chunk whose tool is now running or waiting for the person, so the provider owes nothing. */
function startsToolWork(chunk: ToolChunk): boolean {
  return chunk.type === 'tool-input-available' || chunk.type === 'tool-input-error'
}

function endsToolWork(chunk: ToolChunk): boolean {
  return (
    chunk.type === 'tool-output-available' ||
    chunk.type === 'tool-output-error' ||
    chunk.type === 'tool-output-denied'
  )
}

function toolChunk(value: unknown): ToolChunk | null {
  if (typeof value !== 'object' || value === null || !('type' in value)) return null
  const chunk = value as ToolChunk
  return typeof chunk.type === 'string' ? chunk : null
}

function ownString(value: object, key: string): string | undefined {
  if (!Object.hasOwn(value, key)) return undefined
  const field = Object.getOwnPropertyDescriptor(value, key)?.value
  return typeof field === 'string' ? field : undefined
}

/**
 * Model output, not a stream or step boundary. The reply's `start` chunk arrives immediately,
 * before a reasoning model has produced a token, so it must not end the longer first wait.
 */
function isContentBearing(value: unknown): boolean {
  const chunk = toolChunk(value)
  if (!chunk || typeof value !== 'object' || value === null) return false
  switch (chunk.type) {
    case 'text-delta':
    case 'reasoning-delta':
      return (ownString(value, 'delta') ?? '').length > 0
    case 'tool-input-delta':
      return (ownString(value, 'inputTextDelta') ?? '').length > 0
    case 'file':
    case 'reasoning-file':
    case 'source-url':
    case 'source-document':
      return true
    default:
      return false
  }
}

/**
 * Ends a reply whose provider stops sending without closing the stream: the first content-bearing
 * chunk of each step may take `firstChunkMs`, and every later gap in that step `chunkMs`. Tool
 * execution and the person's approval send no chunk for as long as they take, so they pause the
 * timer instead of tripping it. No event reports a stalled stream, so this timer is the only thing
 * that turns it into a failure. `abort` cancels the provider request, which cancelling this reader
 * does not.
 */
export function withStallTimeout<T>(
  source: ReadableStream<T>,
  { firstChunkMs, chunkMs }: ProviderTimeouts,
  abort?: AbortController
): ReadableStream<T> {
  const reader = source.getReader()
  const workingTools = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let settled = false
  let seenContent = false
  const disarm = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  return new ReadableStream<T>({
    start(controller) {
      const arm = (waitedMs: number): void => {
        disarm()
        timer = setTimeout(() => {
          timer = undefined
          if (settled) return
          settled = true
          const error = new ProviderStallError(waitedMs)
          // The UI reader stopping does not cancel the provider request behind it.
          abort?.abort(error)
          void reader.cancel().catch(() => undefined)
          controller.error(error)
        }, waitedMs)
      }
      // A new step thinks again before its first token, so it gets the longer wait.
      const beginStep = (): void => {
        seenContent = false
        if (workingTools.size === 0) arm(firstChunkMs)
      }
      const pump = async (): Promise<void> => {
        arm(firstChunkMs)
        for (;;) {
          const { done, value } = await reader.read()
          if (settled) return
          if (done) {
            settled = true
            disarm()
            controller.close()
            return
          }
          const chunk = toolChunk(value)
          if (chunk && startsToolWork(chunk)) {
            seenContent = true
            if (chunk.toolCallId) workingTools.add(chunk.toolCallId)
            disarm()
          } else if (chunk && endsToolWork(chunk)) {
            if (chunk.toolCallId) workingTools.delete(chunk.toolCallId)
            if (workingTools.size === 0) beginStep()
          } else if (chunk?.type === 'start-step') {
            beginStep()
          } else if (chunk?.type !== 'finish' && chunk?.type !== 'abort') {
            if (isContentBearing(value)) seenContent = true
            // Boundaries such as `start` keep the first-token wait until real output arrives.
            if (seenContent) arm(chunkMs)
          } else {
            disarm()
          }
          controller.enqueue(value)
        }
      }
      void pump().catch((error: unknown) => {
        if (settled) return
        settled = true
        disarm()
        controller.error(error)
      })
    },
    async cancel(reason) {
      settled = true
      disarm()
      await reader.cancel(reason)
    }
  })
}
