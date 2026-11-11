import { randomHex } from '@open-pencil/scene-graph/random'

import { createOpenAICompatibleAdapter } from '@/app/ai/providers/compatible'
import type { ModelProviderAdapter } from '@/app/ai/providers/types'
import { APP_VERSION } from '@/app/runtime/version'
import { APP_NAME } from '@/constants'

/** OpenCode's chat endpoints; models it serves through other APIs are left out of the catalog. */
export const OPENCODE_ZEN_BASE_URL = 'https://opencode.ai/inference/openai/v1'
export const OPENCODE_GO_BASE_URL = 'https://opencode.ai/inference/go/openai/v1'

/**
 * OpenCode routes and caches by a session named in `x-opencode-session`, and Go rejects requests
 * without one; it also asks clients to name themselves rather than their HTTP library. A model
 * is made for one chat, so each model gets its own session.
 */
function openCodeHeaders(): Record<string, string> {
  return {
    'x-opencode-session': randomHex(),
    'User-Agent': `${APP_NAME}/${APP_VERSION}`
  }
}

export function createOpenCodeAdapter(baseURL: string): ModelProviderAdapter {
  return createOpenAICompatibleAdapter({ baseURL, mode: 'chat', headers: openCodeHeaders })
}
