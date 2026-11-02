import { ACP_AGENTS, AI_PROVIDERS, HARNESS_PROVIDER_ID } from '@open-pencil/core/constants'

import { OPENPENCIL_AI_PROVIDER } from '@/app/ai/providers/openpencil/provider'
import { APP_NAME } from '@/constants'

/**
 * Display name for a provider, agent, or the Pi harness. Cloud's AI service takes the app's name
 * here, since Core's provider list keeps the package's own.
 */
export function modelProviderName(providerID: string): string {
  if (providerID === HARNESS_PROVIDER_ID) return 'Pi'
  if (providerID === OPENPENCIL_AI_PROVIDER) return `${APP_NAME} Cloud`
  if (providerID.startsWith('acp:')) {
    const agentID = providerID.slice('acp:'.length)
    return ACP_AGENTS.find((agent) => agent.id === agentID)?.name ?? providerID
  }
  return AI_PROVIDERS.find((provider) => provider.id === providerID)?.name ?? providerID
}
