import { shallowReactive, shallowReadonly } from 'vue'

import { ACP_AGENTS, type ACPAgentDef, type ACPAgentID } from '@open-pencil/core/constants'

import { agentHostAvailable } from '@/app/ai/agents/host/current'
import { agentAccounts } from '@/app/ai/agents/setup/accounts'
import {
  createAgentConnector,
  type AgentConnectOptions,
  type AgentConnectResult,
  type AgentConnectState
} from '@/app/ai/agents/setup/connect'
import { agentDiscovery } from '@/app/ai/agents/setup/discovery'
import { credentialsReady, isConfigured } from '@/app/ai/chat/storage'
import { isUnconfiguredModelSettings } from '@/app/ai/models/settings/onboarding/apply'
import { aiModelSettings } from '@/app/ai/models/store'

import { activateAgent } from './activate'
import {
  AUTO_AGENT_ORDER,
  connectsWithoutClick,
  rankAgentCandidates,
  type AgentCandidate
} from './pick'

/**
 * Where auto-connect is: `detecting` looks the computer up; `connected` switched the chat to an
 * agent; `action` found one that waits for the person's click; `connecting` runs that click;
 * `failed` stopped at a step the person can retry; `none` found nothing to use; `unsupported`
 * cannot run agents here, as in a browser tab without a companion. `idle` has not looked yet, or
 * looked and left alone a model the person chose, even one the chat cannot send to now.
 */
export type AutoConnectPhase =
  | 'idle'
  | 'detecting'
  | 'connected'
  | 'action'
  | 'connecting'
  | 'failed'
  | 'none'
  | 'unsupported'

/**
 * What a lookup leaves the chat to do: nothing (`connected`), finish in the chat column
 * (`action`, including a step that failed), or set up AI some other way (`none`, `unsupported`).
 */
export type AutoConnectOutcome = 'connected' | 'action' | 'none' | 'unsupported'

interface AgentAutoConnectState {
  phase: AutoConnectPhase
  /** The agent the chat uses or offers: switched on, waiting for a click, or connecting. */
  candidate: AgentCandidate | null
  /** Every agent the last lookup can offer, best first. */
  candidates: AgentCandidate[]
  /** An agent switched on without a click, until the person dismisses the notice. */
  notice: ACPAgentDef | null
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
type Accounts = Pick<
  typeof agentAccounts,
  'account' | 'check' | 'signIn' | 'cancelSignIn' | 'submitCode'
>

export interface AgentAutoConnectOptions {
  discovery: Discovery
  accounts: Accounts
  /** Whether agents can run here now: in the desktop app, or through a paired companion. */
  available: () => boolean
  /** Makes an agent the chat's provider. */
  activate: (agent: ACPAgentDef) => Promise<void> | void
  /** Whether the chat has a model it can send to now. */
  configured: () => boolean | Promise<boolean>
  /**
   * Whether the model settings are still the empty ones a fresh install starts with. Auto-connect
   * switches the chat to an agent, or offers one in the chat column, only while they are and the
   * chat cannot send. It never replaces a model the person chose, even one the chat cannot send
   * to now, such as an API model whose key is locked.
   */
  untouched: () => boolean
}

function agentDef(id: ACPAgentID): ACPAgentDef | undefined {
  return ACP_AGENTS.find((agent) => agent.id === id)
}

/** Raised by an automatic switch-on that found a model set up while it ran. */
class SwitchOnStoppedError extends Error {
  constructor(agent: ACPAgentDef) {
    super(`The chat has a model now, so ${agent.name} stays off.`)
    this.name = 'SwitchOnStoppedError'
  }
}

/**
 * Finds a coding agent already on this computer and makes it the chat's provider while no model
 * is set up. An agent that needs nothing more is switched on without a click; one that needs a
 * sign-in or an install waits for the person to ask, so nothing is installed or signed in to on
 * its own. A lookup in progress is shared, and its result is kept for the session.
 */
export function createAgentAutoConnect({
  discovery,
  accounts,
  available,
  activate,
  configured,
  untouched
}: AgentAutoConnectOptions) {
  const state = shallowReactive<AgentAutoConnectState>({
    phase: 'idle',
    candidate: null,
    candidates: [],
    notice: null
  })
  let running: Promise<AutoConnectOutcome> | null = null
  let rerun: Promise<AutoConnectOutcome> | null = null
  /** Agents being switched on without a click, and those that stopped before activating. */
  const switchingOn = new Set<ACPAgentID>()
  const stopped = new Set<ACPAgentID>()

  /** Whether auto-connect may set the chat up without a click. */
  async function mayActAlone(): Promise<boolean> {
    return untouched() && !(await configured())
  }

  /**
   * Activates an agent, checking again first when it is switched on without a click: the person
   * may have set a model up while the lookup or a check ran.
   */
  async function activateChecked(agent: ACPAgentDef): Promise<void> {
    if (switchingOn.has(agent.id) && !(await mayActAlone())) {
      stopped.add(agent.id)
      throw new SwitchOnStoppedError(agent)
    }
    await activate(agent)
  }

  const connector = createAgentConnector({ discovery, accounts, activate: activateChecked })

  function bridgeReady(): boolean {
    return discovery.canvasBridgeAvailable.value && !discovery.canvasBridgeOutdated.value
  }

  /**
   * Reads the login of installed agents nobody checked yet, all at once. A check another part of
   * the app started, such as Settings, is joined, so the ranking waits for its answer.
   */
  async function checkAccounts(): Promise<void> {
    // Without the MCP server every agent needs an install first, whatever its login.
    if (!bridgeReady()) return
    const unchecked = discovery.agents.value.filter((found) => {
      const account = accounts.account(found.definition.id)
      return (
        AUTO_AGENT_ORDER.includes(found.definition.id) &&
        found.status === 'available' &&
        found.definition.signIn !== undefined &&
        account.status === undefined &&
        account.error === null
      )
    })
    await Promise.all(unchecked.map((found) => accounts.check(found.definition)))
  }

  function settle(phase: AutoConnectPhase, candidate: AgentCandidate | null = null) {
    state.phase = phase
    state.candidate = candidate
  }

  /** Agents cannot run here; the chat sets AI up another way. */
  function unsupported(): 'failed' {
    settle('unsupported')
    return 'failed'
  }

  /**
   * Runs a connection the person asked for. The chat then names nothing on its own, and an
   * attempt already running for the agent leaves the phase as it was.
   */
  async function connectChosen(
    candidate: AgentCandidate,
    options: AgentConnectOptions
  ): Promise<AgentConnectResult> {
    const previous = state.phase
    settle('connecting', candidate)
    const result = await connector.connect(candidate.agent, options)
    if (result === 'busy') settle(previous, candidate)
    else settle(result === 'connected' ? 'connected' : 'failed', candidate)
    if (result === 'connected') state.notice = null
    return result
  }

  /** Switches the chat to a candidate that needs no click, through the steps it already passed. */
  async function switchOn(candidate: AgentCandidate): Promise<AutoConnectOutcome> {
    const id = candidate.agent.id
    state.candidate = candidate
    switchingOn.add(id)
    let result: AgentConnectResult
    try {
      result = await connector.connect(candidate.agent, { installs: false, rescan: false })
    } finally {
      switchingOn.delete(id)
    }
    // A model set up while it ran is the person's choice; a later lookup may act again.
    if (stopped.delete(id)) {
      settle('idle')
      return 'none'
    }
    if (result === 'connected') {
      settle('connected', candidate)
      state.notice = candidate.agent
      return 'connected'
    }
    settle(result === 'failed' ? 'failed' : 'action', candidate)
    return 'action'
  }

  async function run(rescan: boolean): Promise<AutoConnectOutcome> {
    if (!available()) {
      settle('unsupported')
      return 'unsupported'
    }
    settle('detecting')
    if (rescan || !discovery.checked.value) await discovery.refresh(rescan)
    else if (discovery.scanning.value) await discovery.refresh()
    if (discovery.error.value === 'lookup' || !discovery.checked.value) {
      state.candidates = []
      settle('none')
      return 'none'
    }
    await checkAccounts()
    state.candidates = rankAgentCandidates({
      agents: discovery.agents.value,
      account: accounts.account,
      bridge: {
        available: discovery.canvasBridgeAvailable.value,
        outdated: discovery.canvasBridgeOutdated.value
      }
    })
    // A model the person chose stays, usable or not; what was found is still on offer to pick.
    if (!(await mayActAlone())) {
      settle('idle')
      return 'none'
    }
    const best = state.candidates.at(0)
    if (!best) {
      settle('none')
      return 'none'
    }
    if (!connectsWithoutClick(best)) {
      settle('action', best)
      return 'action'
    }
    return switchOn(best)
  }

  /** The outcome of the last lookup, while it still holds. */
  async function kept(): Promise<AutoConnectOutcome | null> {
    switch (state.phase) {
      case 'connected':
        if (await configured()) return 'connected'
        // The chat lost the agent, or cannot reach it any more: look again.
        state.notice = null
        return null
      case 'connecting':
        return available() ? 'action' : null
      case 'action':
      case 'failed':
        // An offer holds while agents run here and the person has set nothing else up.
        return available() && (await mayActAlone()) ? 'action' : null
      case 'none':
        return 'none'
      case 'unsupported':
        // A companion paired since then can run agents now.
        return available() ? null : 'unsupported'
      default:
        return null
    }
  }

  function start(rescan: boolean): Promise<AutoConnectOutcome> {
    const current: Promise<AutoConnectOutcome> = run(rescan)
      .catch((error: unknown): AutoConnectOutcome => {
        // A lookup that cannot finish leaves setup to guided setup, as finding nothing does.
        console.error('[Agents] Looking for coding agents failed:', error)
        settle('none')
        return 'none'
      })
      .finally(() => {
        if (running === current) running = null
      })
    running = current
    return current
  }

  /**
   * Looks for agents on this computer and switches the chat to one that needs no click. Calls
   * while a lookup runs share it, and later calls reuse its outcome. `force` looks the computer
   * up again, after the lookup still running, which may have missed what the person just did.
   */
  async function detect({ force = false }: { force?: boolean } = {}): Promise<AutoConnectOutcome> {
    // A lookup in progress reads as `detecting`, which keeps no outcome, so it is joined below.
    const outcome = force ? null : await kept()
    if (outcome) return outcome
    if (!running) return start(force)
    if (!force) return running
    rerun ??= running.then(() => {
      rerun = null
      return detect({ force: true })
    })
    return rerun
  }

  /**
   * Connects the agent the person chose, from the step that stopped it last, signing in when
   * needed. It installs the adapter and the MCP server only with `installs`, which only a click
   * on the install button passes.
   */
  async function connect(
    id: ACPAgentID,
    { installs = false }: { installs?: boolean } = {}
  ): Promise<AgentConnectResult> {
    const agent = agentDef(id)
    if (!agent) return 'failed'
    if (!available()) return unsupported()
    const candidate = state.candidates.find((found) => found.agent.id === id) ?? {
      agent,
      state: installs ? 'install' : 'sign-in'
    }
    return connectChosen(candidate, { installs })
  }

  /**
   * Switches the chat to an agent found on this computer, as the model picker offers them. One
   * that needs a sign-in or an install waits for the person's click instead.
   */
  async function switchTo(id: ACPAgentID): Promise<AgentConnectResult | 'action'> {
    if (!available()) return unsupported()
    const candidate = state.candidates.find((found) => found.agent.id === id)
    if (!candidate) return 'failed'
    if (!connectsWithoutClick(candidate)) {
      settle('action', candidate)
      return 'action'
    }
    return connectChosen(candidate, { installs: false, rescan: false })
  }

  function dismissNotice(): void {
    state.notice = null
  }

  /** Progress of connecting `id`, for the chat column's stepper. */
  function connection(id: ACPAgentID): AgentConnectState {
    return connector.state(id)
  }

  return {
    state: shallowReadonly(state),
    connector,
    connection,
    detect,
    connect,
    switchTo,
    dismissNotice,
    /** Stops a sign-in the person no longer wants; connecting then stops at that step. */
    cancelSignIn: (id: ACPAgentID) => accounts.cancelSignIn(id),
    /** Sends the code a sign-in page showed. */
    submitSignInCode: (id: ACPAgentID, code: string) => accounts.submitCode(id, code)
  }
}

export type AgentAutoConnect = ReturnType<typeof createAgentAutoConnect>

/**
 * The app's auto-connect, on the computer the app runs agents on. It sets the chat up on its own
 * only while the settings are a fresh install's and nothing can send, once the saved credentials
 * have been read.
 */
export const agentAutoConnect = createAgentAutoConnect({
  discovery: agentDiscovery,
  accounts: agentAccounts,
  available: agentHostAvailable,
  activate: activateAgent,
  async configured() {
    await credentialsReady
    return isConfigured.value
  },
  untouched: () => isUnconfiguredModelSettings(aiModelSettings.value)
})
