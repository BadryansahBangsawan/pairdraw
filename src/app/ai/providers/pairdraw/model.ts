import type { CloudAIClient } from '@pairdraw/cloud/client'

import type { ModelConfig, ModelProviderRuntime } from '@/app/ai/providers/types'

import { PAIRDRAW_AI_PROVIDER } from './provider'

/**
 * A model on Cloud's AI service. The service authorizes with Cloud's token, which the client's
 * fetch adds to every request, so the key is only a placeholder the SDK requires.
 */
export function cloudModelConfig(
  client: CloudAIClient,
  modelID: string
): { config: ModelConfig; runtime: ModelProviderRuntime } {
  return {
    config: {
      providerID: PAIRDRAW_AI_PROVIDER,
      apiKey: 'pairdraw-cloud',
      modelID,
      customModelID: '',
      customBaseURL: client.modelBaseURL,
      customAPIType: 'completions'
    },
    runtime: { fetch: client.fetch }
  }
}
