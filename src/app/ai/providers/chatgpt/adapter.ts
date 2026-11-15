import { createOpenAI } from '@ai-sdk/openai'
import { defaultSettingsMiddleware, wrapLanguageModel } from 'ai'

import { randomHex } from '@pairdraw/scene-graph/random'

import type { ModelProviderAdapter } from '@/app/ai/providers/types'

import { parseChatGPTCredential } from './credential'
import { CHATGPT_CODEX_BASE_URL, chatGPTFetch, ChatGPTSignInExpiredError } from './fetch'

/** ChatGPT accounts reach their models through the Codex backend's Responses API. */
export const chatGPTAdapter: ModelProviderAdapter = {
  create(config, runtime) {
    const credential = parseChatGPTCredential(config.apiKey)
    if (!credential) throw new ChatGPTSignInExpiredError()
    const provider = createOpenAI({
      // The signed fetch replaces this with the account's access token.
      apiKey: 'chatgpt',
      baseURL: CHATGPT_CODEX_BASE_URL,
      fetch: chatGPTFetch(credential, runtime.credentials, runtime.fetch, randomHex(16))
    })
    // The backend keeps nothing, so earlier replies must be sent whole: with `store` off the AI
    // SDK sends their items and encrypted reasoning instead of references to stored ones.
    return wrapLanguageModel({
      model: provider.responses(config.modelID),
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            openai: { store: false, include: ['reasoning.encrypted_content'] }
          }
        }
      })
    })
  }
}
