import { HARNESS_PROVIDER_ID } from '@pairdraw/core/constants'

import { modelVendorLogo, providerLogo, type ProviderLogoID } from '@/app/ai/models/provider-logo'

import type { AgentPresence } from './types'

/**
 * Coding agents by the name their MCP client introduces itself with, which an MCP session
 * publishes as its model: Claude Code names itself `claude-code`, Codex's MCP client
 * `codex-mcp-client`, and Gemini CLI's `gemini-cli-mcp-client`.
 */
const MCP_CLIENT_PROVIDERS: Readonly<Partial<Record<string, string>>> = {
  'claude-code': 'acp:claude-code',
  'codex-mcp-client': 'acp:codex',
  'gemini-cli-mcp-client': 'acp:gemini-cli'
}

/**
 * The logo of what an agent runs on, as the chat's model picker shows it: its provider's, or a
 * router's model maker's. Agents of older versions publish no provider, so their model, MCP
 * client, or kind stands in. Null when nothing identifies the agent.
 */
export function agentLogo(
  agent: Pick<AgentPresence, 'kind' | 'model' | 'provider'>
): ProviderLogoID | null {
  const { kind, model, provider } = agent
  const fromProvider = provider ? providerLogo(provider, model) : null
  if (fromProvider) return fromProvider
  if (kind === 'harness') return providerLogo(HARNESS_PROVIDER_ID)
  if (!model) return null
  if (kind === 'chat') return modelVendorLogo(model)
  const client = MCP_CLIENT_PROVIDERS[model]
  return client ? providerLogo(client) : null
}
