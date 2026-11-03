import * as v from 'valibot'

const tokenCountSchema = v.pipe(v.number(), v.finite(), v.minValue(0))

/**
 * How much of the model's context window a conversation filled with its latest request and
 * reply, as the reply's message metadata carries it under `context`. Agents that report their
 * own window size give `windowTokens`; built-in models leave it to the model catalog.
 */
export const contextUsageSchema = v.object({
  usedTokens: tokenCountSchema,
  windowTokens: v.optional(tokenCountSchema),
  inputTokens: v.optional(tokenCountSchema),
  cachedInputTokens: v.optional(tokenCountSchema),
  outputTokens: v.optional(tokenCountSchema)
})
