import { type ACPAgentDef } from '@pairdraw/core/constants'

import { isSignedIn } from '@/app/ai/agents/acp/auth/status'
import { MCP_INSTALL_COMMAND } from '@/app/automation/mcp/failure'
import { detectUserAgent } from '@/app/tauri/command'

import { type AgentAccount } from './accounts'
import {
  AGENT_CONNECT_STEPS,
  isOtherAdapter,
  type AgentConnectFailure,
  type AgentConnectProblem,
  type AgentConnectState,
  type AgentConnectStep
} from './connect'
import { type DetectedAgent, type DiscoveryError } from './discovery'
import { externalConfigCloud, type ClaudeCodeCloud } from './external'

/** What setup knows about one coding agent and the MCP server it needs. */
export interface AgentSetupState {
  /** False where agents cannot run, so only manual instructions apply. */
  supported: boolean
  /** A check has finished, so a later one keeps showing its results. */
  checked: boolean
  scanning: boolean
  detected: DetectedAgent | null
  /** Pairdraw's MCP server, through which agents reach the canvas. */
  bridge: boolean
  /** The installed MCP server does not match this app's version. */
  bridgeOutdated: boolean
  /** Installs or updates the MCP server by hand. */
  bridgeCommand: string
  /** npm, which one-click installation runs. */
  npm: boolean
  /** Installing the MCP server or the agent's adapter needs administrator rights; absent means no. */
  bridgeNeedsAdmin?: boolean
  /**
   * One click can install or update the MCP server with the package manager that would run,
   * which may be Bun without npm; absent means npm decides.
   */
  bridgeInstallable?: boolean
  adapterNeedsAdmin?: boolean
  installingAgent: boolean
  installingBridge: boolean
  error: DiscoveryError | null
  /** The account the agent uses, read from the agent once its adapter is installed. */
  account?: AgentAccount
  /** Progress of connecting the agent in one action; absent before anyone connects it. */
  connection?: AgentConnectState
}

/** What setup knows about Pi: the Harness companion that runs it and Pi's own settings. */
export interface PiSetupState {
  supported: boolean
  checked: boolean
  scanning: boolean
  /** The `pairdraw-harness` companion that runs Pi. */
  companion: boolean
  companionOutdated: boolean
  companionCommand: string
  bridge: boolean
  bridgeOutdated: boolean
  bridgeCommand: string
  npm: boolean
  /** Installing the companion or the MCP server needs administrator rights; absent means no. */
  companionNeedsAdmin?: boolean
  bridgeNeedsAdmin?: boolean
  /** One click can install or update each, as `AgentSetupState.bridgeInstallable` says. */
  companionInstallable?: boolean
  bridgeInstallable?: boolean
  installingCompanion: boolean
  installingBridge: boolean
  /** The default model set in Pi, used unless Pairdraw names another. */
  defaultModel: string | null
  /** Pi keeps sign-ins; null until read or where they cannot be read. */
  signedIn?: boolean | null
  error: DiscoveryError | null
}

/** What setup knows about Pairdraw's MCP server on its own, for Settings → MCP. */
export type MCPServerSetupState = Pick<
  AgentSetupState,
  | 'supported'
  | 'checked'
  | 'bridge'
  | 'bridgeOutdated'
  | 'bridgeCommand'
  | 'npm'
  | 'bridgeNeedsAdmin'
  | 'bridgeInstallable'
  | 'installingBridge'
  | 'error'
>

/** A Pairdraw companion as setup presents it, with the one-click fix that applies. */
export interface CompanionCheck {
  /** Installed and matching this app. */
  ready: boolean
  outdated: boolean
  installing: boolean
  /** Absent once ready, and where one-click installation cannot run or needs administrator rights. */
  action: 'install' | 'update' | null
}

/** Why setup cannot finish on its own, in the order the person should address it. */
export type SetupProblem =
  | 'needs-npm'
  | 'needs-admin'
  | 'install-failed'
  | 'mcp-start-failed'
  | 'lookup-failed'
  /** The adapter or MCP server is missing, and connecting waits for the person to install it. */
  | 'install-needed'

function companionCheck(
  installed: boolean,
  outdated: boolean,
  installing: boolean,
  npm: boolean
): CompanionCheck {
  const ready = installed && !outdated
  if (ready || !npm) return { ready, outdated, installing, action: null }
  return { ready, outdated, installing, action: outdated ? 'update' : 'install' }
}

/** One-click availability: what discovery reports, or npm without administrator rights. */
function oneClickInstallable(
  installable: boolean | undefined,
  npm: boolean,
  admin: boolean
): boolean {
  return installable ?? (npm && !admin)
}

function setupProblem(
  error: DiscoveryError | null,
  needsNpm: boolean,
  installErrors: readonly DiscoveryError[],
  needsAdmin = false
): SetupProblem | null {
  if (error === 'npm' || needsNpm) return 'needs-npm'
  if (error === 'npm-admin' || needsAdmin) return 'needs-admin'
  if (error !== null && installErrors.includes(error)) return 'install-failed'
  if (error === 'canvas-start') return 'mcp-start-failed'
  if (error === 'lookup') return 'lookup-failed'
  return null
}

/** A coding agent's setup: its CLI and adapter, the MCP server, and what to run by hand. */
export interface AgentSetupView {
  bridge: CompanionCheck
  /** The adapter can be installed with one click. */
  canInstallAdapter: boolean
  busy: boolean
  problem: SetupProblem | null
  /** Commands for where one-click installation cannot help. */
  manualAgentCommand: string | null
  manualBridgeCommand: string | null
  /** The agent's account; null where the agent cannot run yet or does not report one. */
  account: AgentAccountView | null
  /**
   * The program on PATH under the adapter's name is another adapter, such as an older one
   * published under another package, so it neither reports nor signs in to the account.
   */
  adapterMismatch: boolean
  /**
   * A cloud the agent is set up to use outside the app, in place of a sign-in; dropped once the
   * agent reports it is signed out.
   */
  externalConfig?: ClaudeCodeCloud
}

/** The agent's account as setup shows it. */
export interface AgentAccountView {
  state: 'checking' | 'signed-in' | 'signed-out' | 'signing-in' | 'unknown'
  /** The plan or login type the agent names, such as "Claude Max". */
  label: string | null
  /** The account's email, or the agent's own detail line. */
  detail: string | null
  /** One click can sign in, through the agent's own login. */
  canSignIn: boolean
  /** A sign-in page to open by hand while signing in. */
  signInURL: string | null
  acceptsCode: boolean
  error: AgentAccount['error']
  /**
   * Whether a signed-in agent's session reached Pairdraw's tools, with the agent's reason when
   * it did not; null when signed out or when the MCP server cannot report it.
   */
  tools: { state: 'checking' | 'connected' | 'unreachable'; reason: string | null } | null
}

function toolsView(account: AgentAccount, signedIn: boolean): AgentAccountView['tools'] {
  if (!signedIn) return null
  if (account.checking) return { state: 'checking', reason: null }
  const tools = account.tools
  if (tools?.connected === true) return { state: 'connected', reason: null }
  if (tools?.connected === false) return { state: 'unreachable', reason: tools.reason }
  return null
}

function accountState(account: AgentAccount): AgentAccountView['state'] | null {
  if (account.signingIn) return 'signing-in'
  if (account.status === undefined) {
    if (account.checking) return 'checking'
    return account.error ? 'unknown' : null
  }
  if (account.status === null) return account.error ? 'unknown' : null
  return isSignedIn(account.status) ? 'signed-in' : 'signed-out'
}

function accountView(setup: AgentSetupState, mismatch: boolean): AgentAccountView | null {
  const account = setup.account
  if (!account || mismatch || setup.detected?.status !== 'available') return null
  const state = accountState(account)
  if (!state) return null
  const status = account.status
  const signedIn = state === 'signed-in'
  return {
    state,
    label: signedIn ? (status?.label ?? null) : null,
    detail: signedIn ? (status?.account?.email ?? status?.detail ?? null) : null,
    canSignIn: state === 'signed-out' && account.canSignIn,
    signInURL: account.signInURL,
    acceptsCode: account.acceptsCode,
    error: account.error,
    tools: toolsView(account, signedIn)
  }
}

/** The cloud an installed agent is set up to use, while its login does not say otherwise. */
function setupCloud(setup: AgentSetupState): ClaudeCodeCloud | undefined {
  if (setup.detected?.status !== 'available') return undefined
  return externalConfigCloud(setup.detected.externalConfig, setup.account?.status)
}

function adapterMismatch(agent: ACPAgentDef, setup: AgentSetupState): boolean {
  return isOtherAdapter(agent, setup.account?.adapter)
}

/** The agent's install command to run by hand, or null where one click installs its adapter. */
function manualAgentCommand(agent: ACPAgentDef, setup: AgentSetupState): string | null {
  // In a browser tab the agent lives on another computer, which the person sets up elsewhere.
  if (!setup.supported || !agent.installCommand || setup.detected?.status === 'available') {
    return null
  }
  const admin = setup.adapterNeedsAdmin === true
  const oneClick = setup.supported && setup.npm && !admin && setup.error !== 'install'
  if (oneClick && agent.adapterPackage) return null
  return admin && !detectUserAgent().includes('Windows')
    ? `sudo ${agent.installCommand}`
    : agent.installCommand
}

/** The MCP server's install command to run by hand, or null where one click installs it. */
function manualBridgeCommand(setup: AgentSetupState, bridge: CompanionCheck): string | null {
  if (!setup.supported) return null
  const oneClick =
    oneClickInstallable(setup.bridgeInstallable, setup.npm, setup.bridgeNeedsAdmin === true) &&
    setup.error !== 'canvas-install'
  return bridge.ready || oneClick ? null : setup.bridgeCommand
}

export function agentSetupView(agent: ACPAgentDef, setup: AgentSetupState): AgentSetupView {
  const bridgeAdmin = setup.bridgeNeedsAdmin === true
  const adapterAdmin = setup.adapterNeedsAdmin === true
  const bridgeInstallable = oneClickInstallable(setup.bridgeInstallable, setup.npm, bridgeAdmin)
  const bridge = companionCheck(
    setup.bridge,
    setup.bridgeOutdated,
    setup.installingBridge,
    bridgeInstallable
  )
  const status = setup.detected?.status
  const bridgeMissing = setup.detected !== null && !bridge.ready
  const needsNpm =
    !setup.npm &&
    (status === 'needs-adapter' || (bridgeMissing && !bridgeInstallable && !bridgeAdmin))
  const needsAdmin = (status === 'needs-adapter' && adapterAdmin) || (bridgeMissing && bridgeAdmin)
  const mismatch = status === 'available' && adapterMismatch(agent, setup)
  const cloud = setupCloud(setup)
  return {
    bridge,
    canInstallAdapter: status === 'needs-adapter' && setup.npm && !adapterAdmin,
    busy: setup.installingAgent || setup.installingBridge,
    problem: setupProblem(setup.error, needsNpm, ['install', 'canvas-install'], needsAdmin),
    manualAgentCommand:
      mismatch && setup.supported
        ? (agent.installCommand ?? null)
        : manualAgentCommand(agent, setup),
    manualBridgeCommand: manualBridgeCommand(setup, bridge),
    account: accountView(setup, mismatch),
    adapterMismatch: mismatch,
    ...(cloud ? { externalConfig: cloud } : {})
  }
}

/** The MCP server's setup: the one-click fix, and the command for when one click cannot help. */
export interface MCPServerSetupView {
  bridge: CompanionCheck
  problem: SetupProblem | null
  /** Installs the server by hand, by the person or their agent, when one click cannot. */
  manualCommand: string | null
}

export function mcpServerSetupView(setup: MCPServerSetupState): MCPServerSetupView {
  const admin = setup.bridgeNeedsAdmin === true
  const installable =
    setup.supported && oneClickInstallable(setup.bridgeInstallable, setup.npm, admin)
  const bridge = companionCheck(
    setup.bridge,
    setup.bridgeOutdated,
    setup.installingBridge,
    installable
  )
  const oneClick = installable && setup.error !== 'canvas-install'
  let manualCommand: string | null = null
  if (!setup.supported) manualCommand = MCP_INSTALL_COMMAND
  else if (setup.checked && !bridge.ready && !oneClick) manualCommand = setup.bridgeCommand
  return {
    bridge,
    // Where the app cannot install at all, npm and install problems are not the person's to fix.
    problem: setup.supported
      ? setupProblem(
          setup.error,
          setup.checked && !setup.npm && !bridge.ready && !installable && !admin,
          ['canvas-install'],
          setup.checked && admin && !bridge.ready
        )
      : null,
    manualCommand
  }
}

/**
 * Which sentence setup puts above an agent's card: the account it is signed in to, or, for an
 * agent that brings its own credentials, the providers and model set up in it.
 */
export function agentDescriptionKind(agent: ACPAgentDef): 'own-credentials' | 'account' {
  return agent.ownCredentials ? 'own-credentials' : 'account'
}

/** Pi's setup: the Harness companion, the MCP server, and what to run by hand. */
export interface PiSetupView {
  companion: CompanionCheck
  bridge: CompanionCheck
  busy: boolean
  problem: SetupProblem | null
  manualCommands: string[]
}

/** One companion as Pi's setup weighs it: its check and what blocks a one-click install. */
function piCompanion(
  installed: boolean,
  outdated: boolean,
  installing: boolean,
  installable: boolean | undefined,
  npm: boolean,
  needsAdmin: boolean | undefined
) {
  const admin = needsAdmin === true
  const oneClick = oneClickInstallable(installable, npm, admin)
  const check = companionCheck(installed, outdated, installing, oneClick)
  return {
    check,
    /** Missing, and nothing that runs without npm can install it. */
    needsNpm: !check.ready && !oneClick && !admin,
    needsAdmin: !check.ready && admin,
    /** Missing, and only a command run by hand installs it. */
    manual: !check.ready && !oneClick
  }
}

export function piSetupView(setup: PiSetupState): PiSetupView {
  const harness = piCompanion(
    setup.companion,
    setup.companionOutdated,
    setup.installingCompanion,
    setup.companionInstallable,
    setup.npm,
    setup.companionNeedsAdmin
  )
  const server = piCompanion(
    setup.bridge,
    setup.bridgeOutdated,
    setup.installingBridge,
    setup.bridgeInstallable,
    setup.npm,
    setup.bridgeNeedsAdmin
  )
  const needsAdmin = setup.checked && (harness.needsAdmin || server.needsAdmin)
  const failed = setup.error === 'harness-install' || setup.error === 'canvas-install'
  const manual = harness.manual || server.manual || needsAdmin || failed
  return {
    companion: harness.check,
    bridge: server.check,
    busy: setup.installingCompanion || setup.installingBridge,
    problem: setupProblem(
      setup.error,
      setup.checked && !setup.npm && (harness.needsNpm || server.needsNpm),
      ['harness-install', 'canvas-install'],
      needsAdmin
    ),
    manualCommands: manual
      ? [
          ...(harness.check.ready ? [] : [setup.companionCommand]),
          ...(server.check.ready ? [] : [setup.bridgeCommand])
        ]
      : []
  }
}

/** A connection step as setup shows it; `manual` is one only the person can do. */
export type AgentConnectStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'manual'

export interface AgentConnectView {
  /** The steps that apply to this agent, in order. */
  steps: { step: AgentConnectStep; status: AgentConnectStepStatus }[]
  running: boolean
  /** Every step is done, so connecting again only checks. */
  connected: boolean
  failure: AgentConnectFailure | null
  /** What stopped a lookup or install, which setup names the same as everywhere else. */
  problem: SetupProblem | null
  /** The command that signs in to an agent setup cannot sign in to, such as Gemini CLI. */
  signInCommand: string | null
}

const DISCOVERY_PROBLEMS: ReadonlySet<AgentConnectProblem> = new Set([
  'lookup',
  'install',
  'npm',
  'canvas-install',
  'canvas-start',
  'npm-admin'
])

function isDiscoveryProblem(problem: AgentConnectProblem): problem is DiscoveryError {
  return DISCOVERY_PROBLEMS.has(problem)
}

/** A check setup runs on its own, such as the lookup when the settings open. */
function checking(
  step: AgentConnectStep,
  setup: AgentSetupState,
  account: AgentAccountView | null
) {
  if (step === 'detect') return setup.scanning && !setup.checked
  return step === 'sign-in' && (account?.state === 'checking' || account?.state === 'signing-in')
}

/** Steps already satisfied by what setup found, before or between attempts to connect. */
function satisfied(
  step: AgentConnectStep,
  setup: AgentSetupState,
  account: AgentAccountView | null
) {
  if (step === 'detect') return setup.checked && setup.error !== 'lookup'
  if (step === 'install') {
    return setup.detected?.status === 'available' && setup.bridge && !setup.bridgeOutdated
  }
  if (step === 'sign-in') {
    return account?.state === 'signed-in' || Boolean(setupCloud(setup))
  }
  if (step === 'tools') return account?.tools?.state === 'connected'
  return false
}

/** The stepper for connecting a coding agent in one action. */
export function agentConnectView(agent: ACPAgentDef, setup: AgentSetupState): AgentConnectView {
  const connection = setup.connection
  const { account, problem } = agentSetupView(agent, setup)
  const failure = connection?.failure ?? null
  // An attempt not allowed to install leaves that step to the person's click.
  const waitsForInstall = failure?.problem === 'install-needed' ? failure.step : null
  const steps = AGENT_CONNECT_STEPS.filter((step) => {
    // Only a login setup reads tells whether a session reaches the tools.
    if (step === 'tools') return agent.signIn !== undefined
    if (step === 'sign-in') return !agent.ownCredentials
    return step !== 'activate' || connection?.activates === true
  }).map((step) => {
    const recorded = connection?.steps[step] ?? 'pending'
    let status: AgentConnectStepStatus = 'pending'
    if (step === waitsForInstall) status = 'manual'
    else if (recorded === 'running' || recorded === 'failed') status = recorded
    else if (checking(step, setup, account)) status = 'running'
    else if (step === 'sign-in' && !agent.signIn) status = 'manual'
    else if (recorded !== 'pending' || satisfied(step, setup, account)) status = 'done'
    return { step, status }
  })
  const running = connection?.running === true
  const discoveryFailure = failure && isDiscoveryProblem(failure.problem) ? failure.problem : null
  let connectProblem: SetupProblem | null = waitsForInstall ? 'install-needed' : null
  if (discoveryFailure) {
    connectProblem = problem ?? setupProblem(discoveryFailure, false, ['install', 'canvas-install'])
  }
  return {
    steps,
    running,
    connected: !running && steps.every(({ status }) => status === 'done' || status === 'manual'),
    failure,
    problem: connectProblem,
    signInCommand: agent.signIn || agent.ownCredentials ? null : (agent.cliCommand ?? agent.command)
  }
}
