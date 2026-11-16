import type { ACPAgentDef } from '@pairdraw/core/constants'

/** What the chat names beside a coding agent that refused a message for want of a sign-in. */
export interface AgentSignInHelp {
  /** The command that signs in to the agent, or null where the agent has no sign-in of its own. */
  command: string | null
  /** Setup can sign the agent in itself, so the chat points at its connect action. */
  fromSetup: boolean
  /** The agent brings its own credentials and found nothing to use, so it has no sign-in. */
  unconfigured: boolean
}

/**
 * What a person can do about an agent that refused a message for want of a sign-in. An agent that
 * brings its own credentials, such as omp, has no sign-in to run: it needs a provider set up in
 * its own configuration, which Pairdraw's setup cannot do for it.
 */
export function agentSignInHelp(agent: ACPAgentDef): AgentSignInHelp {
  if (agent.ownCredentials) {
    return { command: null, fromSetup: false, unconfigured: true }
  }
  return {
    command: agent.cliCommand ?? agent.command,
    fromSetup: agent.signIn !== undefined,
    unconfigured: false
  }
}
