import * as v from 'valibot'

const tokenCountSchema = v.pipe(v.number(), v.finite(), v.minValue(0))

/**
 * The tokens one assistant turn spent, as the provider or coding agent reported them. Input
 * counts the whole prompt including its cached part, as the AI SDK and agents report it; the
 * cached read is broken out separately so a meter can show it and price it at its own rate.
 * A field a provider never reports stays absent.
 */
export const turnUsageSchema = v.object({
  inputTokens: tokenCountSchema,
  outputTokens: tokenCountSchema,
  cacheReadTokens: v.optional(tokenCountSchema),
  cacheWriteTokens: v.optional(tokenCountSchema),
  reasoningTokens: v.optional(tokenCountSchema)
})

export type TurnUsage = v.InferOutput<typeof turnUsageSchema>

/** A model's list price in US dollars per million tokens, when the catalog knows it. */
export interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
  /** Cached input is usually cheaper; absent it is priced as fresh input. */
  cacheReadPerMTok?: number
}
