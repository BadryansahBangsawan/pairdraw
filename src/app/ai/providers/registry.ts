import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

import type { AIProviderID } from '@open-pencil/core/constants'

import { bedrockAdapter } from '@/app/ai/providers/bedrock/adapter'
import { chatGPTAdapter } from '@/app/ai/providers/chatgpt/adapter'
import {
  createAnthropicCompatibleAdapter,
  createOpenAICompatibleAdapter
} from '@/app/ai/providers/compatible'
import {
  createOpenCodeAdapter,
  OPENCODE_GO_BASE_URL,
  OPENCODE_ZEN_BASE_URL
} from '@/app/ai/providers/opencode'
import type { ModelProviderAdapter } from '@/app/ai/providers/types'
import { vertexAdapter } from '@/app/ai/providers/vertex/adapter'

type DirectProviderID = Exclude<AIProviderID, `acp:${string}` | `harness:${string}`>

const MODEL_PROVIDER_ADAPTERS = {
  openrouter: {
    create(config, runtime) {
      const provider = createOpenRouter({
        apiKey: config.apiKey,
        fetch: runtime.fetch,
        headers: {
          'X-OpenRouter-Title': 'OpenPencil',
          'HTTP-Referer': 'https://github.com/open-pencil/open-pencil'
        }
      })
      return provider(config.customModelID.trim() || config.modelID)
    }
  },
  anthropic: createAnthropicCompatibleAdapter(),
  openai: createOpenAICompatibleAdapter(),
  chatgpt: chatGPTAdapter,
  google: {
    create(config, runtime) {
      return createGoogleGenerativeAI({ apiKey: config.apiKey, fetch: runtime.fetch })(
        config.modelID
      )
    }
  },
  deepseek: {
    create(config, runtime) {
      return createDeepSeek({ apiKey: config.apiKey, fetch: runtime.fetch })(config.modelID)
    }
  },
  zai: createAnthropicCompatibleAdapter({ baseURL: 'https://api.z.ai/api/anthropic' }),
  minimax: createOpenAICompatibleAdapter({ baseURL: 'https://api.minimax.io/v1', mode: 'chat' }),
  xai: createOpenAICompatibleAdapter({ baseURL: 'https://api.x.ai/v1', mode: 'chat' }),
  meta: createOpenAICompatibleAdapter({ baseURL: 'https://api.meta.ai/v1', mode: 'chat' }),
  'kimi-for-coding': createOpenAICompatibleAdapter({
    baseURL: 'https://api.kimi.ai/coding/v1',
    mode: 'chat'
  }),
  moonshot: createOpenAICompatibleAdapter({ baseURL: 'https://api.moonshot.ai/v1', mode: 'chat' }),
  together: createOpenAICompatibleAdapter({ baseURL: 'https://api.together.xyz/v1', mode: 'chat' }),
  fireworks: createOpenAICompatibleAdapter({
    baseURL: 'https://api.fireworks.ai/inference/v1',
    mode: 'chat'
  }),
  'opencode-zen': createOpenCodeAdapter(OPENCODE_ZEN_BASE_URL),
  'opencode-go': createOpenCodeAdapter(OPENCODE_GO_BASE_URL),
  'openai-compatible': createOpenAICompatibleAdapter({
    baseURL: (config) => config.customBaseURL,
    mode: 'configurable'
  }),
  'anthropic-compatible': createAnthropicCompatibleAdapter({
    baseURL: (config) => config.customBaseURL
  }),
  // Their connections keep the region, or the project and location, as the base URL.
  'amazon-bedrock': bedrockAdapter,
  'google-vertex': vertexAdapter,
  // The base URL and the token-carrying fetch come from Cloud's AI service, not from settings.
  openpencil: createOpenAICompatibleAdapter({
    baseURL: (config) => config.customBaseURL,
    mode: 'chat'
  })
} satisfies Record<DirectProviderID, ModelProviderAdapter>

function isDirectProviderID(providerID: AIProviderID): providerID is DirectProviderID {
  return !providerID.startsWith('acp:') && providerID !== 'harness:pi'
}

export function modelProviderAdapter(providerID: AIProviderID): ModelProviderAdapter {
  if (!isDirectProviderID(providerID)) {
    throw new Error('ACP providers and Harness agents do not use direct API models')
  }
  return MODEL_PROVIDER_ADAPTERS[providerID]
}
