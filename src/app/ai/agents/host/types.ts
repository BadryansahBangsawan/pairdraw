import type { ACPAgentDef } from '@pairdraw/core/constants'

import type { AgentAuthCheck } from '@/app/ai/agents/acp/auth/session'
import type { AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'
import type { PackageManager } from '@/app/ai/agents/setup/companions'
import type { AgentLookup } from '@/app/ai/agents/setup/native'

/** An agent process's stdio, which the ACP connection reads and writes, and the way to stop it. */
export interface AgentStreams {
  input: WritableStream<Uint8Array>
  output: ReadableStream<Uint8Array>
  /** Stops the agent; its output then ends without an error. */
  close(): Promise<void>
}

export interface AgentSpawnOptions {
  /** Names the agent's diagnostic output, such as its stderr in the console. */
  logId?: string
  /** Called when the agent exits before `close()` asked it to. */
  onExit?: () => void
}

/** What a host may install: an agent's ACP adapter or one of Pairdraw's companions. */
type AgentInstallTarget =
  | { kind: 'adapter'; agent: ACPAgentDef }
  | { kind: 'companion'; companion: 'mcp' | 'harness' }

interface AgentInstallOptions {
  /** The search path the last detection reported, so the package manager finds its tools. */
  searchPath: string
  manager: PackageManager
}

/** A sign-in the agent runs, usually in the browser, until it finishes or is cancelled. */
export interface AgentSignIn {
  /** Resolves with the login the agent reports afterwards, null when it reports none. */
  done: Promise<AgentAuthStatus | null>
  /** Sends the code the sign-in page shows; absent when the sign-in reads no code. */
  submitCode?: (code: string) => Promise<void>
  cancel(): Promise<void>
}

interface AgentSignInRequest {
  /** The auth method, advertised by the agent, that setup signs in with. */
  methodId: string
  /** Told the sign-in page to open by hand, when the login prints one. */
  onURL: (url: string) => void
}

/**
 * Where coding agents run: the desktop shell today, a companion program on the person's
 * computer later. Setup and the ACP chat reach agents only through a host, so each host brings
 * its own way to find, install, sign in to, check, and start them.
 */
export interface AgentHost {
  /** Looks up agents, Pairdraw's companions, and package managers on the agents' computer. */
  detect(): Promise<AgentLookup>
  /** Installs an adapter or companion globally; rejects when it did not finish. */
  install(target: AgentInstallTarget, options: AgentInstallOptions): Promise<void>
  /** Starts the agent's own sign-in through the method it advertised. */
  signIn(agent: ACPAgentDef, request: AgentSignInRequest): Promise<AgentSignIn>
  /** Starts the agent, reads its login, and checks that a session reaches Pairdraw's tools. */
  check(agent: ACPAgentDef): Promise<AgentAuthCheck>
  /** Starts the agent and returns its stdio for an ACP connection. */
  spawn(agent: ACPAgentDef, options?: AgentSpawnOptions): Promise<AgentStreams>
  /** The folder agents start in, outside the person's projects. */
  workspace(): Promise<string>
}
