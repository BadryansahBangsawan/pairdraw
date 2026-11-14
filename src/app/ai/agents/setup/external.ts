import type * as v from 'valibot'

import type { ACPAgentID } from '@pairdraw/core/constants'

import { isSignedIn, type AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'

import type { claudeCodeCloudSchema } from './schema'

/**
 * A cloud Claude Code reaches Claude through instead of an Anthropic sign-in, set up outside
 * the app with `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `CLAUDE_CODE_USE_FOUNDRY`
 * in its environment or settings. The app only reports it; the agent's own config does the rest.
 */
export type ClaudeCodeCloud = v.InferOutput<typeof claudeCodeCloudSchema>

/** Product names, shown as they are in every language. */
export const CLAUDE_CODE_CLOUD_NAMES: Record<ClaudeCodeCloud, string> = {
  bedrock: 'Amazon Bedrock',
  vertex: 'Google Vertex AI',
  foundry: 'Microsoft Foundry'
}

/** The agent whose external config the lookup reports. */
export const EXTERNAL_CONFIG_AGENT: ACPAgentID = 'claude-code'

/**
 * The cloud to show for an agent's external config, or nothing. The lookup's switch is only a
 * hint until the agent reports its login: a signed-out report wins, since the agent may not honour
 * the switch (an older version, or a project setting that turns it off).
 */
export function externalConfigCloud(
  cloud: ClaudeCodeCloud | undefined,
  status: AgentAuthStatus | null | undefined
): ClaudeCodeCloud | undefined {
  if (!cloud) return undefined
  if (status === undefined || status === null) return cloud
  return isSignedIn(status) ? cloud : undefined
}
