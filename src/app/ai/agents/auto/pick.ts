import { sortBy } from 'es-toolkit'

import { ACP_AGENTS, type ACPAgentDef, type ACPAgentID } from '@open-pencil/core/constants'

import { isSignedIn } from '@/app/ai/agents/acp/auth/status'
import type { AgentAccount } from '@/app/ai/agents/setup/accounts'
import { isOtherAdapter } from '@/app/ai/agents/setup/connect'
import type { DetectedAgent } from '@/app/ai/agents/setup/discovery'
import { ONBOARDING_AGENTS } from '@/app/ai/models/settings/onboarding/plan'

/**
 * The coding agents auto-connect looks for, in the order setup offers them. Pi is left out: it
 * runs through the desktop app's Harness companion, which only guided setup installs.
 */
export const AUTO_AGENT_ORDER: readonly ACPAgentID[] = ONBOARDING_AGENTS.flatMap((providerID) => {
  const agent = ACP_AGENTS.find((candidate) => `acp:${candidate.id}` === providerID)
  return agent ? [agent.id] : []
})

/**
 * How close an agent on this computer is to chatting, best first: `ready` needs nothing,
 * `unknown-login` is installed but does not say whether it is signed in, `sign-in` needs the
 * person to sign in, and `install` needs its adapter or the MCP server installed.
 */
const AGENT_CANDIDATE_STATES = ['ready', 'unknown-login', 'sign-in', 'install'] as const
export type AgentCandidateState = (typeof AGENT_CANDIDATE_STATES)[number]

/** An agent auto-connect can offer, with what it still needs. */
export interface AgentCandidate {
  agent: ACPAgentDef
  state: AgentCandidateState
}

export interface AgentCandidateInput {
  /** What the last lookup found. */
  agents: readonly DetectedAgent[]
  /** The login each agent reported, as setup records it. */
  account: (id: ACPAgentID) => AgentAccount
  /** The MCP server agents reach the canvas through. */
  bridge: { available: boolean; outdated: boolean }
}

/** Whether the person installed the agent itself, not only something that could fetch it. */
function installedByPerson(found: DetectedAgent): boolean {
  // An adapter carries its agent; without one, only the agent's own CLI shows it is there.
  return (
    found.status === 'available' || (found.status === 'needs-adapter' && found.cliPath !== null)
  )
}

function candidateState(
  found: DetectedAgent,
  account: AgentAccount,
  bridgeReady: boolean
): AgentCandidateState | null {
  const agent = found.definition
  if (!installedByPerson(found)) return null
  // Another adapter under the agent's name can neither report nor sign in to the account.
  if (isOtherAdapter(agent, account.adapter)) return null
  if (found.status !== 'available' || !bridgeReady) return 'install'
  // Agents setup cannot sign in to, such as Gemini CLI, never report a login.
  if (!agent.signIn) return 'unknown-login'
  // Not checked yet, or the check could not start the agent: nothing to go on.
  if (account.status === undefined || account.error === 'check') return null
  if (account.status === null) return 'unknown-login'
  if (!isSignedIn(account.status)) return account.canSignIn ? 'sign-in' : null
  return account.tools?.connected === false ? null : 'ready'
}

/**
 * The agents on this computer auto-connect can use, best first: an agent closer to chatting
 * always wins, and setup's order breaks ties. Agents that are missing, cannot start, run another
 * adapter, or are signed in without reaching the tools are left out.
 */
export function rankAgentCandidates({
  agents,
  account,
  bridge
}: AgentCandidateInput): AgentCandidate[] {
  const bridgeReady = bridge.available && !bridge.outdated
  const candidates = AUTO_AGENT_ORDER.flatMap((id): AgentCandidate[] => {
    const found = agents.find((candidate) => candidate.definition.id === id)
    const state = found ? candidateState(found, account(id), bridgeReady) : null
    return found && state ? [{ agent: found.definition, state }] : []
  })
  return sortBy(candidates, [
    (candidate) => AGENT_CANDIDATE_STATES.indexOf(candidate.state),
    (candidate) => AUTO_AGENT_ORDER.indexOf(candidate.agent.id)
  ])
}

/** Candidates the chat switches to without a click. */
export function connectsWithoutClick(candidate: AgentCandidate): boolean {
  return candidate.state === 'ready' || candidate.state === 'unknown-login'
}
