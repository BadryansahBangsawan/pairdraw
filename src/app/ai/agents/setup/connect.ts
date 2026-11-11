import { ref } from 'vue'

import type { ACPAgentDef, ACPAgentID } from '@open-pencil/core/constants'

import { isSignedIn } from '@/app/ai/agents/acp/auth/status'

import type { agentAccounts } from './accounts'
import type { agentDiscovery, DiscoveryError } from './discovery'

/** What connecting a coding agent does, in order. */
export const AGENT_CONNECT_STEPS = ['detect', 'install', 'sign-in', 'tools', 'activate'] as const
export type AgentConnectStep = (typeof AGENT_CONNECT_STEPS)[number]

/** `skipped` is a step with nothing to do: already satisfied, or not one this agent needs. */
export type AgentConnectStepState = 'pending' | 'running' | 'done' | 'skipped' | 'failed'

/** Why a step stopped; setup shows the fix from it and from the setup state it read. */
export type AgentConnectProblem =
  | DiscoveryError
  /** The agent's own CLI is missing and only the person can install it, as for Gemini CLI. */
  | 'cli-missing'
  /** The adapter or MCP server is missing or outdated, and this attempt was not allowed to install. */
  | 'install-needed'
  /** Setup could not start the agent to read its login. */
  | 'check'
  /** The program under the adapter's name is another adapter, which cannot sign in. */
  | 'adapter-mismatch'
  | 'sign-in'
  /** The sign-in ended, or was cancelled, without a login. */
  | 'signed-out'
  /** A signed-in session did not reach OpenPencil's tools. */
  | 'tools'
  /** Making the agent the chat's provider failed. */
  | 'activate'

export interface AgentConnectFailure {
  step: AgentConnectStep
  problem: AgentConnectProblem
}

export interface AgentConnectState {
  steps: Record<AgentConnectStep, AgentConnectStepState>
  running: boolean
  /** The step that stopped the last attempt; connecting again resumes from it. */
  failure: AgentConnectFailure | null
  /** Connecting ends by making the agent the chat's provider. */
  activates: boolean
}

export type AgentConnectResult = 'connected' | 'failed' | 'busy'

/** How one attempt to connect may act on the agents' computer. */
export interface AgentConnectOptions {
  /**
   * Whether the attempt may install the agent's adapter and the MCP server; true by default.
   * Without it, a missing or outdated one stops the attempt with `install-needed`, so nothing is
   * installed until the person asks.
   */
  installs?: boolean
  /**
   * Whether the attempt looks the computer up again; true by default. Without it, it uses the
   * lookup discovery already holds, joining one that is still running.
   */
  rescan?: boolean
}

type Discovery = Pick<
  typeof agentDiscovery,
  | 'agents'
  | 'error'
  | 'checked'
  | 'scanning'
  | 'refresh'
  | 'install'
  | 'setupCanvasBridge'
  | 'canvasBridgeAvailable'
  | 'canvasBridgeOutdated'
>
type Accounts = Pick<typeof agentAccounts, 'account' | 'check' | 'signIn'>

export interface AgentConnectorOptions {
  discovery: Discovery
  accounts: Accounts
  /** Makes the connected agent the chat's provider; without it, connecting stops at the tools. */
  activate?: (agent: ACPAgentDef) => Promise<void> | void
}

const PENDING: AgentConnectState['steps'] = {
  detect: 'pending',
  install: 'pending',
  'sign-in': 'pending',
  tools: 'pending',
  activate: 'pending'
}

/** What a step reports when it fails in a way it did not name. */
const FALLBACK_PROBLEM: Record<AgentConnectStep, AgentConnectProblem> = {
  detect: 'lookup',
  install: 'install',
  'sign-in': 'sign-in',
  tools: 'tools',
  activate: 'activate'
}

class StepFailureError extends Error {
  constructor(readonly problem: AgentConnectProblem) {
    super(`Connecting the agent stopped: ${problem}`)
    this.name = 'StepFailureError'
  }
}

/** The program under the adapter's name answered as another adapter. */
export function isOtherAdapter(
  agent: ACPAgentDef,
  adapter: { name: string } | null | undefined
): boolean {
  return Boolean(agent.adapterPackage && adapter && adapter.name !== agent.adapterPackage)
}

/**
 * Connects a coding agent in one action: finds it, installs its adapter and OpenPencil's MCP
 * server when missing, signs in when needed, checks that a session reaches OpenPencil's tools,
 * and makes it the chat's provider. It stops at the first step that fails, and connecting again
 * resumes from that step; steps already satisfied finish without doing anything. An attempt that
 * may not install stops before installing anything, so a later one the person asks for can.
 */
export function createAgentConnector({ discovery, accounts, activate }: AgentConnectorOptions) {
  const states = ref<Partial<Record<ACPAgentID, AgentConnectState>>>({})
  const idle: AgentConnectState = {
    steps: PENDING,
    running: false,
    failure: null,
    activates: activate !== undefined
  }

  function state(id: ACPAgentID): AgentConnectState {
    return states.value[id] ?? idle
  }

  function update(id: ACPAgentID, patch: Partial<AgentConnectState>) {
    states.value = { ...states.value, [id]: { ...state(id), ...patch } }
  }

  function mark(id: ACPAgentID, step: AgentConnectStep, value: AgentConnectStepState) {
    update(id, { steps: { ...state(id).steps, [step]: value } })
  }

  function detected(agent: ACPAgentDef) {
    return discovery.agents.value.find((candidate) => candidate.definition.id === agent.id)
  }

  /** Stops on the problem discovery recorded, if any. */
  function assertNoDiscoveryError() {
    const error = discovery.error.value
    if (error) throw new StepFailureError(error)
  }

  async function detect(rescan: boolean): Promise<AgentConnectStepState> {
    if (rescan) await discovery.refresh(true)
    // A lookup still running is joined; one that finished is used as it is.
    else if (!discovery.checked.value || discovery.scanning.value) await discovery.refresh()
    // Only the lookup counts here: an earlier install that failed, such as Pi's, is no reason to
    // stop, and the install step reports this agent's own.
    if (discovery.error.value === 'lookup') throw new StepFailureError('lookup')
    return 'done'
  }

  function bridgeMissing(): boolean {
    return !discovery.canvasBridgeAvailable.value || discovery.canvasBridgeOutdated.value
  }

  async function install(
    agent: ACPAgentDef,
    resumed: boolean,
    installs: boolean
  ): Promise<AgentConnectStepState> {
    // Resuming after an install by hand must see what is there now.
    if (resumed) await detect(true)
    const found = detected(agent)
    if (!found) throw new StepFailureError('lookup')
    if (found.status === 'not-installed') throw new StepFailureError('cli-missing')
    if (!installs && (found.status === 'needs-adapter' || bridgeMissing())) {
      throw new StepFailureError('install-needed')
    }
    let changed = false
    if (found.status === 'needs-adapter') {
      await discovery.install(agent.id)
      assertNoDiscoveryError()
      if (detected(agent)?.status !== 'available') throw new StepFailureError('install')
      changed = true
    }
    if (bridgeMissing()) {
      await discovery.setupCanvasBridge()
      assertNoDiscoveryError()
      if (bridgeMissing()) throw new StepFailureError('canvas-install')
      changed = true
    }
    return changed ? 'done' : 'skipped'
  }

  /** Starts the agent to read its login and reach the tools, stopping if it cannot start. */
  async function check(agent: ACPAgentDef) {
    await accounts.check(agent)
    const account = accounts.account(agent.id)
    if (account.error === 'check') throw new StepFailureError('check')
    if (isOtherAdapter(agent, account.adapter)) throw new StepFailureError('adapter-mismatch')
    return account
  }

  async function signIn(agent: ACPAgentDef, recheck: boolean): Promise<AgentConnectStepState> {
    // Agents setup cannot sign in to, such as Gemini CLI, report no login to check.
    if (!agent.signIn) return 'skipped'
    const known = accounts.account(agent.id)
    const account =
      recheck || known.status === undefined || known.error !== null ? await check(agent) : known
    if (isOtherAdapter(agent, account.adapter)) throw new StepFailureError('adapter-mismatch')
    // An agent that does not report its login cannot be signed in by setup.
    if (!account.status || isSignedIn(account.status)) return 'skipped'
    if (!account.canSignIn) throw new StepFailureError('sign-in')
    await accounts.signIn(agent)
    const after = accounts.account(agent.id)
    if (after.error) throw new StepFailureError(after.error)
    if (!after.status || !isSignedIn(after.status)) throw new StepFailureError('signed-out')
    return 'done'
  }

  async function tools(agent: ACPAgentDef, resumed: boolean): Promise<AgentConnectStepState> {
    if (!agent.signIn) return 'skipped'
    // A signed-in check already started a session the way a chat does.
    const account = resumed ? await check(agent) : accounts.account(agent.id)
    if (account.tools?.connected === false) throw new StepFailureError('tools')
    return account.tools?.connected ? 'done' : 'skipped'
  }

  async function makeActive(agent: ACPAgentDef): Promise<AgentConnectStepState> {
    if (!activate) return 'skipped'
    await activate(agent)
    return 'done'
  }

  function runStep(
    step: AgentConnectStep,
    agent: ACPAgentDef,
    resumed: boolean,
    { installs = true, rescan = true }: AgentConnectOptions
  ): Promise<AgentConnectStepState> {
    if (step === 'detect') return detect(rescan)
    if (step === 'install') return install(agent, resumed, installs)
    if (step === 'sign-in') {
      // A new adapter, or a resumed attempt, must be asked again.
      return signIn(agent, resumed || state(agent.id).steps.install === 'done')
    }
    if (step === 'tools') return tools(agent, resumed)
    return makeActive(agent)
  }

  /** Runs the steps from the one that failed last, or from the start. */
  async function connect(
    agent: ACPAgentDef,
    options: AgentConnectOptions = {}
  ): Promise<AgentConnectResult> {
    const current = state(agent.id)
    if (current.running) return 'busy'
    const from = current.failure ? AGENT_CONNECT_STEPS.indexOf(current.failure.step) : 0
    const steps = { ...current.steps }
    for (const step of AGENT_CONNECT_STEPS.slice(from)) steps[step] = 'pending'
    update(agent.id, { steps, running: true, failure: null })
    try {
      for (const [index, step] of AGENT_CONNECT_STEPS.entries()) {
        if (index < from) continue
        mark(agent.id, step, 'running')
        try {
          mark(agent.id, step, await runStep(step, agent, from > 0 && index === from, options))
        } catch (error) {
          const problem = error instanceof StepFailureError ? error.problem : FALLBACK_PROBLEM[step]
          mark(agent.id, step, 'failed')
          update(agent.id, { failure: { step, problem } })
          return 'failed'
        }
      }
      return 'connected'
    } finally {
      update(agent.id, { running: false })
    }
  }

  return { activates: activate !== undefined, state, connect }
}
