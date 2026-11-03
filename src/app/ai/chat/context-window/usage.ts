import type { TextStreamPart, ToolSet, UIMessage, UIMessageChunk } from 'ai'
import * as v from 'valibot'

import { messageMetadata } from '@/app/ai/chat/metadata'

import { contextUsageSchema } from './schema'

export type ContextUsage = v.InferOutput<typeof contextUsageSchema>

/** The reply metadata that carries a `ContextUsage`. */
export interface ContextUsageMetadata {
  context: ContextUsage
}

/** The usage the latest reply that reported one carries, or null before any did. */
export function latestContextUsage(messages: readonly UIMessage[]): ContextUsage | null {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role !== 'assistant') continue
    const parsed = v.safeParse(contextUsageSchema, messageMetadata(message).context)
    if (parsed.success) return parsed.output
  }
  return null
}

/**
 * The built-in chat's `messageMetadata` for each finished step: the step's request and its
 * answer are what the next request starts from, so together they are what the context holds.
 */
export function stepContextMetadata({
  part
}: {
  part: TextStreamPart<ToolSet>
}): ContextUsageMetadata | undefined {
  if (part.type !== 'finish-step') return undefined
  const { usage } = part
  if (usage.inputTokens === undefined && usage.outputTokens === undefined) return undefined
  const context: ContextUsage = {
    usedTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
  }
  if (usage.inputTokens !== undefined) context.inputTokens = usage.inputTokens
  if (usage.inputTokenDetails.cacheReadTokens !== undefined) {
    context.cachedInputTokens = usage.inputTokenDetails.cacheReadTokens
  }
  if (usage.outputTokens !== undefined) context.outputTokens = usage.outputTokens
  return { context }
}

/** An ACP agent's `usage_update`, which names both the tokens in its context and its size. */
export function agentContextChunk(update: { used: number; size: number }): UIMessageChunk {
  const metadata: ContextUsageMetadata = {
    context: { usedTokens: update.used, windowTokens: update.size }
  }
  return { type: 'message-metadata', messageMetadata: metadata }
}
