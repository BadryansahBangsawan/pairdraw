import { describe, expect, test } from 'bun:test'

import type { UIMessage } from 'ai'
import * as v from 'valibot'

import {
  addTurnUsage,
  chatUsage,
  estimatedCostUsd,
  formatCostUsd,
  turnUsageFromReported,
  turnUsageOf,
  withTurnUsage
} from '@/app/ai/chat/usage/aggregate'
import { turnUsageSchema } from '@/app/ai/chat/usage/schema'

function reply(metadata: unknown): UIMessage {
  return { id: crypto.randomUUID(), role: 'assistant', parts: [], metadata }
}

describe('turnUsageSchema', () => {
  test('accepts a reported turn with input and output', () => {
    const parsed = v.safeParse(turnUsageSchema, { inputTokens: 100, outputTokens: 40 })
    expect(parsed.success).toBe(true)
  })

  test('rejects a negative or non-finite token count', () => {
    expect(v.safeParse(turnUsageSchema, { inputTokens: -1, outputTokens: 0 }).success).toBe(false)
    expect(v.safeParse(turnUsageSchema, { inputTokens: Number.NaN, outputTokens: 0 }).success).toBe(
      false
    )
  })
})

describe('addTurnUsage', () => {
  test('sums input and output and keeps the cached breakdown', () => {
    const sum = addTurnUsage(
      { inputTokens: 100, outputTokens: 40, cacheReadTokens: 30 },
      { inputTokens: 50, outputTokens: 10, cacheReadTokens: 5, cacheWriteTokens: 2 }
    )
    expect(sum).toEqual({
      inputTokens: 150,
      outputTokens: 50,
      cacheReadTokens: 35,
      cacheWriteTokens: 2
    })
  })

  test('a field one turn never reported stays absent', () => {
    const sum = addTurnUsage(
      { inputTokens: 10, outputTokens: 2 },
      { inputTokens: 3, outputTokens: 1 }
    )
    expect(sum.cacheReadTokens).toBeUndefined()
    expect(sum.reasoningTokens).toBeUndefined()
  })
})

describe('turnUsageOf / withTurnUsage', () => {
  test('reads back the usage a reply carries', () => {
    const message = withTurnUsage(reply({}), { inputTokens: 12, outputTokens: 4 })
    expect(turnUsageOf(message)).toEqual({ inputTokens: 12, outputTokens: 4 })
  })

  test('a reply with no usage reads null', () => {
    expect(turnUsageOf(reply({}))).toBeNull()
    expect(turnUsageOf(reply({ usage: { inputTokens: -5 } }))).toBeNull()
  })

  test('a user message never carries turn usage', () => {
    const user: UIMessage = {
      id: 'u',
      role: 'user',
      parts: [],
      metadata: { usage: { inputTokens: 1, outputTokens: 1 } }
    }
    expect(turnUsageOf(user)).toBeNull()
  })
})

describe('chatUsage', () => {
  test('sums the assistant turns that reported usage', () => {
    const messages = [
      reply({}),
      withTurnUsage(reply({}), { inputTokens: 100, outputTokens: 40 }),
      { id: 'u', role: 'user', parts: [] } as UIMessage,
      withTurnUsage(reply({}), { inputTokens: 60, outputTokens: 20, cacheReadTokens: 10 })
    ]
    expect(chatUsage(messages)).toEqual({
      turns: 2,
      total: { inputTokens: 160, outputTokens: 60, cacheReadTokens: 10 }
    })
  })

  test('a chat with no reported usage has a null total', () => {
    expect(chatUsage([reply({}), reply({})])).toEqual({ turns: 0, total: null })
  })
})

describe('estimatedCostUsd', () => {
  const pricing = { inputPerMTok: 3, outputPerMTok: 15 }

  test('prices input and output per million tokens', () => {
    const cost = estimatedCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, pricing)
    expect(cost).toBeCloseTo(18, 6)
  })

  test('cached input is priced at its own rate when given', () => {
    const cost = estimatedCostUsd(
      { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 1_000_000 },
      { ...pricing, cacheReadPerMTok: 0.3 }
    )
    expect(cost).toBeCloseTo(3.3, 6)
  })

  test('no pricing means no cost', () => {
    expect(estimatedCostUsd({ inputTokens: 100, outputTokens: 100 }, null)).toBeNull()
  })
})

describe('formatCostUsd', () => {
  test('formats a cost as US dollars', () => {
    expect(formatCostUsd(0.5)).toBe('$0.50')
  })

  test('a sub-cent cost keeps its fractions instead of reading as free', () => {
    expect(formatCostUsd(0.0035)).toBe('$0.0035')
  })
})

describe('turnUsageFromReported', () => {
  test('normalizes a provider step with a cached breakdown', () => {
    expect(
      turnUsageFromReported({
        inputTokens: 100,
        outputTokens: 40,
        cacheReadTokens: 30,
        cacheWriteTokens: 5,
        reasoningTokens: 12
      })
    ).toEqual({
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 30,
      cacheWriteTokens: 5,
      reasoningTokens: 12
    })
  })

  test('null fields a coding agent leaves out stay absent', () => {
    expect(
      turnUsageFromReported({
        inputTokens: 80,
        outputTokens: 20,
        cacheReadTokens: null,
        cacheWriteTokens: null
      })
    ).toEqual({ inputTokens: 80, outputTokens: 20 })
  })

  test('a report with no input and output is null', () => {
    expect(turnUsageFromReported({ inputTokens: null, outputTokens: null })).toBeNull()
    expect(turnUsageFromReported({})).toBeNull()
  })
})
