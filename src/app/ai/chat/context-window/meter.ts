import { locale } from '@open-pencil/vue/i18n'

import type { ContextUsage } from './usage'

/** Roughly how many characters of English or code one token holds, for estimates only. */
const CHARACTERS_PER_TOKEN = 4
/** From here the meter warns that the conversation is filling the model's context. */
const CONTEXT_WARNING_FRACTION = 0.7
/** From here replies may lose earlier context, so the meter suggests a new chat. */
const CONTEXT_FULL_FRACTION = 0.9

type ContextLevel = 'normal' | 'warning' | 'full'

/** What the chat header shows about a conversation's context: tokens only, never a cost. */
export interface ContextMeter {
  usedTokens: number
  /** Null while the model's window is unknown, as for a custom model the catalog does not list. */
  windowTokens: number | null
  /** The used share of the window, from 0 to 1, or null without a window. */
  fraction: number | null
  level: ContextLevel
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  /** Estimated tokens of the pinned style kit and references in the next request that carries them. */
  pinnedTokens: number
  /** Whether a reply reported usage yet; before it, the meter shows only the window. */
  measured: boolean
}

/** A rough token count for text the chat adds itself, such as the pinned note. */
export function estimateTokens(text: string): number {
  return text ? Math.ceil(text.length / CHARACTERS_PER_TOKEN) : 0
}

function levelOf(fraction: number | null): ContextLevel {
  if (fraction === null || fraction < CONTEXT_WARNING_FRACTION) return 'normal'
  return fraction < CONTEXT_FULL_FRACTION ? 'warning' : 'full'
}

/**
 * The meter for a conversation: its latest reported usage against the window the agent reported
 * or, for built-in models, the window the model catalog lists for the current model.
 */
export function contextMeter(
  usage: ContextUsage | null,
  catalogWindow: number | null,
  pinnedTokens: number
): ContextMeter {
  const windowTokens = usage?.windowTokens ?? catalogWindow
  const usedTokens = usage?.usedTokens ?? 0
  const fraction =
    windowTokens && windowTokens > 0 ? Math.min(1, Math.max(0, usedTokens / windowTokens)) : null
  return {
    usedTokens,
    windowTokens: windowTokens && windowTokens > 0 ? windowTokens : null,
    fraction,
    level: levelOf(fraction),
    inputTokens: usage?.inputTokens ?? null,
    cachedInputTokens: usage?.cachedInputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    pinnedTokens,
    measured: usage !== null
  }
}

const compactFormats = new Map<string, Intl.NumberFormat>()
const percentFormats = new Map<string, Intl.NumberFormat>()

function cachedFormat(
  cache: Map<string, Intl.NumberFormat>,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const language = locale.get()
  let format = cache.get(language)
  if (!format) {
    format = new Intl.NumberFormat(language, options)
    cache.set(language, format)
  }
  return format
}

/** A token count as the header shows it, such as “12.4K”, in the app's language. */
export function formatTokens(count: number): string {
  return cachedFormat(compactFormats, { notation: 'compact', maximumFractionDigits: 1 }).format(
    count
  )
}

/** A share of the window, such as “34%”, in the app's language. */
export function formatContextShare(fraction: number): string {
  return cachedFormat(percentFormats, { style: 'percent', maximumFractionDigits: 0 }).format(
    fraction
  )
}
