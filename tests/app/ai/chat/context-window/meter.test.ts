import { describe, expect, test } from 'bun:test'

import type { UIMessage, UIMessageChunk } from 'ai'

import {
  contextMeter,
  estimateTokens,
  formatContextShare,
  formatTokens
} from '@/app/ai/chat/context-window/meter'
import {
  agentContextChunk,
  latestContextUsage,
  stepContextMetadata
} from '@/app/ai/chat/context-window/usage'

import { asDouble } from '#tests/helpers/doubles'

function reply(metadata: unknown): UIMessage {
  return { id: crypto.randomUUID(), role: 'assistant', parts: [], metadata }
}

type StepPart = Parameters<typeof stepContextMetadata>[0]['part']

function finishStep(usage: {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
}): StepPart {
  // Only the fields the metadata reads; the rest of a finished step does not matter here.
  return asDouble<StepPart>({
    type: 'finish-step',
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      inputTokenDetails: { cacheReadTokens: usage.cacheReadTokens }
    }
  })
}

describe('context usage', () => {
  test('a finished step reports its request and answer as the context in use', () => {
    expect(
      stepContextMetadata({
        part: finishStep({ inputTokens: 9000, outputTokens: 1000, cacheReadTokens: 6000 })
      })
    ).toEqual({
      context: {
        usedTokens: 10_000,
        inputTokens: 9000,
        cachedInputTokens: 6000,
        outputTokens: 1000
      }
    })
    expect(stepContextMetadata({ part: finishStep({}) })).toBeUndefined()
    const text = asDouble<StepPart>({ type: 'text-delta', id: 't', text: 'Hi' })
    expect(stepContextMetadata({ part: text })).toBeUndefined()
  })

  test('an agent reports its own window', () => {
    const chunk: UIMessageChunk = agentContextChunk({ used: 50_000, size: 200_000 })
    expect(chunk).toEqual({
      type: 'message-metadata',
      messageMetadata: { context: { usedTokens: 50_000, windowTokens: 200_000 } }
    })
  })

  test('the latest reply that reported usage counts', () => {
    const messages = [
      reply({ context: { usedTokens: 100 } }),
      { id: 'u', role: 'user', parts: [] } satisfies UIMessage,
      reply({ context: { usedTokens: 900, windowTokens: 1000 } }),
      reply({ stopped: true })
    ]
    expect(latestContextUsage(messages)).toEqual({ usedTokens: 900, windowTokens: 1000 })
    expect(latestContextUsage([reply({ context: { usedTokens: -1 } })])).toBeNull()
  })
})

describe('context meter', () => {
  test('measures against the window the agent reported before the catalog’s', () => {
    const meter = contextMeter({ usedTokens: 950, windowTokens: 1000 }, 4000, 12)
    expect(meter.fraction).toBe(0.95)
    expect(meter.level).toBe('full')
    expect(meter.pinnedTokens).toBe(12)
  })

  test('warns as the context fills and stays plain without a window', () => {
    expect(contextMeter({ usedTokens: 750 }, 1000, 0).level).toBe('warning')
    expect(contextMeter({ usedTokens: 100 }, 1000, 0).level).toBe('normal')
    const unknown = contextMeter({ usedTokens: 5000 }, null, 0)
    expect(unknown.fraction).toBeNull()
    expect(unknown.level).toBe('normal')
    const fresh = contextMeter(null, 128_000, 0)
    expect(fresh.measured).toBe(false)
    expect(fresh.fraction).toBe(0)
  })

  test('formats tokens compactly, and estimates the chat’s own notes', () => {
    expect(formatTokens(12_400)).toBe('12.4K')
    expect(formatContextShare(0.34)).toBe('34%')
    expect(estimateTokens('abcdefgh')).toBe(2)
    expect(estimateTokens('')).toBe(0)
  })
})
