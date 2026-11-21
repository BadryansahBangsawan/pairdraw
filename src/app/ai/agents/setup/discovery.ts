import { computed, ref, shallowRef } from 'vue'

import { ACP_AGENTS, type ACPAgentDef, type ACPAgentID } from '@pairdraw/core/constants'

import { agentHost, agentHostAvailable, piHostAvailable } from '@/app/ai/agents/host/current'
import type { AgentHost } from '@/app/ai/agents/host/types'
import {
  HARNESS_EXECUTABLE,
  HARNESS_INSTALL_TARGET,
  HARNESS_PACKAGE
} from '@/app/ai/agents/pi/companion'
import { MCP_EXECUTABLE, MCP_INSTALL_TARGET, MCP_PACKAGE_NAME } from '@/app/automation/mcp/failure'
import { detectUserAgent } from '@/app/tauri/command'

import {
  companionPackageManager,
  globalInstallCommand,
  isOutdatedCompanion,
  type PackageManager
} from './companions'
import { EXTERNAL_CONFIG_AGENT, type ClaudeCodeCloud } from './external'
import type { AgentLookup } from './native'

export type DetectedAgent = {
  definition: ACPAgentDef
  cliPath: string | null
  adapterPath: string | null
  status: 'available' | 'needs-adapter' | 'not-installed'
  /** A cloud the agent is set up to use instead of its own sign-in; absent when none is. */
  externalConfig?: ClaudeCodeCloud
}

export function detectedAgents(lookup: AgentLookup): DetectedAgent[] {
  return ACP_AGENTS.map((definition) => {
    const cliPath = lookup.executables[definition.cliCommand ?? definition.command] ?? null
    const adapterPath = lookup.executables[definition.command] ?? null
    // An adapter package carries its agent, so it installs whether or not the CLI is there.
    const unavailableStatus = definition.adapterPackage ? 'needs-adapter' : 'not-installed'
    const externalConfig =
      definition.id === EXTERNAL_CONFIG_AGENT ? lookup.claudeCodeCloud : undefined
    return {
      definition,
      cliPath,
      adapterPath,
      status: adapterPath ? 'available' : unavailableStatus,
      ...(externalConfig ? { externalConfig } : {})
    }
  })
}

/** What went wrong in the last lookup or installation. */
export type DiscoveryError =
  | 'lookup'
  | 'install'
  | 'npm'
  | 'canvas-install'
  | 'canvas-start'
  | 'harness-install'
  /** npm's global folder needs administrator rights, which the app never asks for. */
  | 'npm-admin'

export function createAgentDiscovery(options: {
  /** Whether agents can run here; a function when that changes, as a companion pairs. */
  enabled: boolean | (() => boolean)
  /** Whether the host runs Pi, through the desktop app's Harness companion; defaults to true. */
  runsPi?: boolean
  /**
   * Resolves once the companions updating with the app finished. Setup waits here, so two package
   * managers never reify into the same global prefix.
   */
  settle?: () => Promise<void>
  lookup: () => Promise<AgentLookup>
  install: (agent: ACPAgentDef, searchPath: string) => Promise<void>
  installBridge?: (searchPath: string, manager: PackageManager) => Promise<void>
  restartBridge?: () => Promise<void>
  installHarness?: (searchPath: string, manager: PackageManager) => Promise<void>
}) {
  const isEnabled = () =>
    typeof options.enabled === 'function' ? options.enabled() : options.enabled
  const snapshot = shallowRef<AgentLookup | null>(null)
  const scanning = ref(false)
  const installing = ref<ACPAgentID | 'canvas' | 'harness' | null>(null)
  const error = ref<DiscoveryError | null>(null)
  let pending: Promise<void> | null = null
  const agents = computed(() => (snapshot.value ? detectedAgents(snapshot.value) : []))
  const availableAgents = computed(() =>
    agents.value.filter((agent) => agent.status === 'available')
  )
  const npmAvailable = computed(() => Boolean(snapshot.value?.executables.npm))
  /** A lookup has finished, so a later rescan can keep showing its results. */
  const checked = computed(() => snapshot.value !== null)
  // Checks read through functions so they see the snapshot of a rescan that just finished.
  function hasBridge(): boolean {
    return Boolean(snapshot.value?.executables[MCP_EXECUTABLE])
  }
  /** An installed MCP server whose version does not match the app. */
  function bridgeOutdated(): boolean {
    return hasBridge() && isOutdatedCompanion(snapshot.value?.versions[MCP_PACKAGE_NAME])
  }
  function canInstallWith(manager: PackageManager): boolean {
    return Boolean(snapshot.value?.executables[manager])
  }
  /** npm installs global packages where this user cannot write, so only an administrator can. */
  function npmNeedsAdmin(): boolean {
    return snapshot.value?.npmGlobalWritable === false
  }
  /**
   * The package manager that installed a companion updates it, so the new copy replaces the
   * old one on PATH; another manager would install beside it and leave the old copy first.
   * A new install uses npm, or Bun when npm would need administrator rights.
   */
  function managerFor(executable: string): PackageManager {
    const path = snapshot.value?.executables[executable]
    if (path) return companionPackageManager(path)
    return npmNeedsAdmin() && canInstallWith('bun') ? 'bun' : 'npm'
  }
  /** Installing this companion would need administrator rights. */
  function needsAdmin(executable: string): boolean {
    return managerFor(executable) === 'npm' && npmNeedsAdmin()
  }
  function installCommand(target: string, executable: string): string {
    // Run by hand in the person's own terminal, which may find a manager the app cannot.
    return globalInstallCommand(target, managerFor(executable), {
      admin: needsAdmin(executable),
      windows: detectUserAgent().includes('Windows')
    })
  }
  function hasHarness(): boolean {
    return Boolean(snapshot.value?.executables[HARNESS_EXECUTABLE])
  }
  function harnessOutdated(): boolean {
    return hasHarness() && isOutdatedCompanion(snapshot.value?.versions[HARNESS_PACKAGE])
  }
  const canvasBridgeAvailable = computed(hasBridge)
  const canvasBridgeOutdated = computed(bridgeOutdated)
  /** The Harness companion that runs Pi. */
  const harnessAvailable = computed(hasHarness)
  const harnessOutdatedVersion = computed(harnessOutdated)
  /** Commands to install or update a companion by hand, for the package manager that has it. */
  const canvasBridgeCommand = computed(() => installCommand(MCP_INSTALL_TARGET, MCP_EXECUTABLE))
  const harnessCommand = computed(() => installCommand(HARNESS_INSTALL_TARGET, HARNESS_EXECUTABLE))
  const canvasBridgeNeedsAdmin = computed(() => needsAdmin(MCP_EXECUTABLE))
  const harnessNeedsAdmin = computed(() => needsAdmin(HARNESS_EXECUTABLE))
  /** One click can install or update it, with the package manager that would run. */
  function installable(executable: string): boolean {
    return canInstallWith(managerFor(executable)) && !needsAdmin(executable)
  }
  const canvasBridgeInstallable = computed(() => installable(MCP_EXECUTABLE))
  const harnessInstallable = computed(() => installable(HARNESS_EXECUTABLE))
  /** Agent adapters always come from npm. */
  const adapterNeedsAdmin = computed(npmNeedsAdmin)

  function refresh(force = false): Promise<void> {
    if (!isEnabled()) return Promise.resolve()
    if (pending) return force ? pending.then(() => refresh()) : pending
    scanning.value = true
    error.value = null
    pending = options
      .lookup()
      .then((result) => {
        snapshot.value = result
        return undefined
      })
      .catch(() => {
        error.value = 'lookup'
      })
      .finally(() => {
        scanning.value = false
        pending = null
      })
    return pending
  }

  async function install(id: ACPAgentID): Promise<void> {
    if (!isEnabled() || installing.value) return
    const agent = agents.value.find((candidate) => candidate.definition.id === id)
    if (!agent?.definition.adapterPackage || agent.status !== 'needs-adapter') return
    if (!snapshot.value || !npmAvailable.value) {
      error.value = 'npm'
      return
    }
    if (npmNeedsAdmin()) {
      error.value = 'npm-admin'
      return
    }
    installing.value = id
    error.value = null
    try {
      await options.settle?.()
      await options.install(agent.definition, snapshot.value.searchPath)
      await refresh(true)
      if (
        agents.value.find((candidate) => candidate.definition.id === id)?.status !== 'available'
      ) {
        error.value = 'install'
      }
    } catch {
      error.value = 'install'
    } finally {
      installing.value = null
    }
  }

  async function setupCanvasBridge(): Promise<void> {
    if (!isEnabled() || installing.value || !snapshot.value) return
    let installed = hasBridge() && !bridgeOutdated()
    const manager = managerFor(MCP_EXECUTABLE)
    if (!installed && !canInstallWith(manager)) {
      // A Bun copy the app cannot update leaves only the command run by hand.
      error.value = manager === 'npm' ? 'npm' : 'canvas-install'
      return
    }
    if (!installed && needsAdmin(MCP_EXECUTABLE)) {
      error.value = 'npm-admin'
      return
    }
    installing.value = 'canvas'
    error.value = null
    try {
      await options.settle?.()
      if (!installed) {
        if (!options.installBridge) throw new Error('Canvas bridge setup is unavailable.')
        await options.installBridge(snapshot.value.searchPath, manager)
        await refresh(true)
        if (!hasBridge() || bridgeOutdated())
          throw new Error('A matching MCP server was not found.')
        installed = true
      }
      await options.restartBridge?.()
    } catch {
      error.value = installed ? 'canvas-start' : 'canvas-install'
    } finally {
      installing.value = null
    }
  }

  async function setupHarness(): Promise<void> {
    if (!isEnabled() || installing.value || !snapshot.value) return
    if (hasHarness() && !harnessOutdated()) return
    const manager = managerFor(HARNESS_EXECUTABLE)
    if (!canInstallWith(manager)) {
      error.value = manager === 'npm' ? 'npm' : 'harness-install'
      return
    }
    if (needsAdmin(HARNESS_EXECUTABLE)) {
      error.value = 'npm-admin'
      return
    }
    installing.value = 'harness'
    error.value = null
    try {
      await options.settle?.()
      if (!options.installHarness) throw new Error('Harness companion setup is unavailable.')
      await options.installHarness(snapshot.value.searchPath, manager)
      await refresh(true)
      if (!hasHarness() || harnessOutdated()) error.value = 'harness-install'
    } catch {
      error.value = 'harness-install'
    } finally {
      installing.value = null
    }
  }

  return {
    get supported() {
      return isEnabled()
    },
    runsPi: options.runsPi ?? true,
    agents,
    availableAgents,
    scanning,
    checked,
    installing,
    error,
    npmAvailable,
    canvasBridgeAvailable,
    canvasBridgeOutdated,
    canvasBridgeCommand,
    canvasBridgeNeedsAdmin,
    canvasBridgeInstallable,
    harnessAvailable,
    harnessOutdated: harnessOutdatedVersion,
    harnessCommand,
    harnessNeedsAdmin,
    harnessInstallable,
    adapterNeedsAdmin,
    setupCanvasBridge,
    setupHarness,
    refresh,
    install
  }
}

/** Discovery on the computer a host runs agents on, through what the host finds and installs. */
export function createHostedAgentDiscovery(
  host: Pick<AgentHost, 'detect' | 'install'>,
  options: {
    enabled: boolean | (() => boolean)
    runsPi?: boolean
    restartBridge?: () => Promise<void>
    settle?: () => Promise<void>
  }
) {
  return createAgentDiscovery({
    enabled: options.enabled,
    runsPi: options.runsPi,
    settle: options.settle,
    lookup: () => host.detect(),
    // Agent adapters always come from npm.
    install: (agent, searchPath) =>
      host.install({ kind: 'adapter', agent }, { searchPath, manager: 'npm' }),
    installBridge: (searchPath, manager) =>
      host.install({ kind: 'companion', companion: 'mcp' }, { searchPath, manager }),
    installHarness: (searchPath, manager) =>
      host.install({ kind: 'companion', companion: 'harness' }, { searchPath, manager }),
    restartBridge: options.restartBridge
  })
}

/** Restarts the app's own MCP server, so one just installed or updated is the one that runs. */
export async function restartAppMCPServer(): Promise<void> {
  const { restartMCPRuntime } = await import('@/app/automation/mcp/runtime')
  const result = await restartMCPRuntime()
  if (!result.ok) throw result.error
}

export const agentDiscovery = createHostedAgentDiscovery(agentHost(), {
  enabled: agentHostAvailable,
  runsPi: piHostAvailable,
  restartBridge: restartAppMCPServer,
  // Imported here so the update, which reads this discovery, is not a module-level cycle.
  settle: () => import('./update').then(({ companionUpdate }) => companionUpdate.settled())
})
