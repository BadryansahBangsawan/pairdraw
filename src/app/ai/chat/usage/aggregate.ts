import type { UIMessage } from 'ai'
import * as v from 'valibot'

import { locale } from '@pairdraw/vue/i18n'

import { messageMetadata, withMetadata } from '@/app/ai/chat/metadata'

import { type ModelPricing, type TurnUsage, turnUsageSchema } from './schema'

export type { ModelPricing, TurnUsage } from './schema'

/** Adds two turns' tokens, keeping a cached or reasoning breakdown only once one reported it. */
export function addTurnUsage(a: TurnUsage, b: TurnUsage): TurnUsage {
  const sum: TurnUsage = {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens
  }
  const optional = (key: 'cacheReadTokens' | 'cacheWriteTokens' | 'reasoningTokens') => {
    const left = a[key]
    const right = b[key]
    if (left !== undefined || right !== undefined) sum[key] = (left ?? 0) + (right ?? 0)
  }
  optional('cacheReadTokens')
  optional('cacheWriteTokens')
  optional('reasoningTokens')
  return sum
}

/** The raw token fields a provider step or coding agent reports, any of which it may leave out. */
export interface ReportedUsage {
  inputTokens?: number | null
  outputTokens?: number | null
  cacheReadTokens?: number | null
  cacheWriteTokens?: number | null
  reasoningTokens?: number | null
}

/**
 * A turn's usage from what a provider or agent reported, or null when it named no input and
 * output. A field reported as null or absent stays absent, so the meter shows only what was told.
 */
export function turnUsageFromReported(reported: ReportedUsage): TurnUsage | null {
  const { inputTokens, outputTokens } = reported
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') return null
  const usage: TurnUsage = { inputTokens, outputTokens }
  const optional = (key: 'cacheReadTokens' | 'cacheWriteTokens' | 'reasoningTokens') => {
    const value = reported[key]
    if (typeof value === 'number') usage[key] = value
  }
  optional('cacheReadTokens')
  optional('cacheWriteTokens')
  optional('reasoningTokens')
  return usage
}
/** The tokens an assistant reply carries in its metadata, or null when it reported none. */
export function turnUsageOf(message: UIMessage): TurnUsage | null {
  if (message.role !== 'assistant') return null
  const parsed = v.safeParse(turnUsageSchema, messageMetadata(message).usage)
  return parsed.success ? parsed.output : null
}

/** The reply with its turn usage merged into its metadata, built from the plain message. */
export function withTurnUsage(message: UIMessage, usage: TurnUsage): UIMessage {
  return withMetadata(message, { usage })
}

export interface ChatUsage {
  /** How many assistant turns reported usage. */
  turns: number
  /** The summed tokens of those turns, or null before any reported. */
  total: TurnUsage | null
}

/** A conversation's running token total, summed from the assistant turns that reported usage. */
export function chatUsage(messages: readonly UIMessage[]): ChatUsage {
  let turns = 0
  let total: TurnUsage | null = null
  for (const message of messages) {
    const usage = turnUsageOf(message)
    if (!usage) continue
    turns += 1
    total = total ? addTurnUsage(total, usage) : usage
  }
  return { turns, total }
}

const TOKENS_PER_MILLION = 1_000_000

/**
 * What a turn's tokens cost in US dollars at the model's list price, or null when the catalog
 * holds no price for it. Cached input is priced at its own rate when given, else as fresh input.
 */
export function estimatedCostUsd(usage: TurnUsage, pricing: ModelPricing | null): number | null {
  if (!pricing) return null
  const cacheRead = usage.cacheReadTokens ?? 0
  const cacheRate = pricing.cacheReadPerMTok ?? pricing.inputPerMTok
  return (
    (usage.inputTokens * pricing.inputPerMTok +
      usage.outputTokens * pricing.outputPerMTok +
      cacheRead * cacheRate) /
    TOKENS_PER_MILLION
  )
}

const costFormats = new Map<string, Intl.NumberFormat>()

/** A cost as the meter shows it, such as “$0.50” or a sub-cent “$0.0035”, in the app's language. */
export function formatCostUsd(cost: number): string {
  const language = locale.get()
  let format = costFormats.get(language)
  if (!format) {
    format = new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    })
    costFormats.set(language, format)
  }
  return format.format(cost)
}
