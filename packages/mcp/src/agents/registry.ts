import { ACP_AGENTS } from '@open-pencil/core/constants'

/**
 * An agent the companion may start. Every command line is fixed here: a client names an agent
 * by its id and never sends a program, arguments, or environment.
 */
export interface CompanionAgent {
  id: string
  /** The ACP program the bridge starts. */
  command: string
  args: readonly string[]
  /** The agent's own CLI, when the ACP program is a separate adapter for it. */
  cliCommand?: string
  /** The npm package `install` puts on the computer, when the ACP program is an adapter. */
  adapterPackage?: string
  /** Arguments of a sign-in the agent runs in a terminal, such as Claude's browser login. */
  terminalSignIn?: readonly string[]
}

/** The agents the app offers, as `ACP_AGENTS` in Core defines them. */
export const COMPANION_AGENTS: readonly CompanionAgent[] = ACP_AGENTS.map((agent) => ({
  id: agent.id,
  command: agent.command,
  args: [...agent.args],
  cliCommand: agent.cliCommand,
  adapterPackage: agent.adapterPackage,
  terminalSignIn: agent.signIn?.via === 'terminal' ? [...agent.signIn.args] : undefined
}))

/** The agent a route names, or undefined for an id the companion does not know. */
export function findCompanionAgent(
  registry: readonly CompanionAgent[],
  id: string
): CompanionAgent | undefined {
  return registry.find((agent) => agent.id === id)
}
