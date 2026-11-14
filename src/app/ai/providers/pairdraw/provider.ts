import type { AIProviderID } from '@pairdraw/core/constants'

/**
 * The provider whose models a Cloud workspace's plan pays for, through the AI service the Home
 * server advertises. Its catalog, not the provider definition, names the models.
 */
export const PAIRDRAW_AI_PROVIDER = 'pairdraw' as const satisfies AIProviderID
