import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import { readonly, ref, type Ref } from 'vue'

import { IS_TAURI } from '@pairdraw/core/constants'

import { agentHost } from '@/app/ai/agents/host/current'
import type { AgentHost } from '@/app/ai/agents/host/types'
import { HARNESS_EXECUTABLE, HARNESS_PACKAGE } from '@/app/ai/agents/pi/companion'
import { MCP_EXECUTABLE, MCP_PACKAGE_NAME } from '@/app/automation/mcp/failure'
import { appRuntimeConfig } from '@/app/runtime/config'
import { APP_VERSION } from '@/app/runtime/version'

import {
  CLI_EXECUTABLE,
  CLI_PACKAGE,
  companionPackageManager,
  type Companion,
  type PackageManager
} from './companions'
import { agentDiscovery, restartAppMCPServer } from './discovery'
import type { AgentLookup } from './native'

/** Each companion, by the program that shows it is installed and the package it comes from. */
const COMPANIONS: { companion: Companion; executable: string; packageName: string }[] = [
  { companion: 'mcp', executable: MCP_EXECUTABLE, packageName: MCP_PACKAGE_NAME },
  { companion: 'harness', executable: HARNESS_EXECUTABLE, packageName: HARNESS_PACKAGE },
  { companion: 'cli', executable: CLI_EXECUTABLE, packageName: CLI_PACKAGE }
]

type CompanionUpdate = { companion: Companion; manager: PackageManager }

/**
 * The installed companions whose version is not the app's, each with the package manager that
 * installed it. Those that manager is missing for, or could update only with administrator
 * rights, are left to guided setup, which names the command.
 */
function outdatedCompanions(lookup: AgentLookup, appVersion: string): CompanionUpdate[] {
  return COMPANIONS.flatMap(({ companion, executable, packageName }) => {
    const path = lookup.executables[executable]
    if (!path) return []
    const version = lookup.versions[packageName] ?? null
    // Another program of the same name, such as the Linux desktop app, has no CLI package.
    if (companion === 'cli' && version === null) return []
    if (version === appVersion) return []
    const manager = companionPackageManager(path)
    if (!lookup.executables[manager]) return []
    if (manager === 'npm' && lookup.npmGlobalWritable === false) return []
    return [{ companion, manager }]
  })
}

/** Whether an update is running, finished, or failed; idle when there was nothing to update. */
type CompanionUpdateState = 'idle' | 'updating' | 'updated' | 'failed'

/**
 * Updates the companions already installed on this computer to the app's version, once per
 * app version, so an app that updated itself does not leave its MCP server, CLI, or Harness
 * behind. It installs nothing that is not there, and a failure is not retried until the next
 * version; guided setup still updates by hand.
 */
export function createCompanionUpdate(
  host: Pick<AgentHost, 'detect' | 'install'>,
  options: {
    enabled: boolean
    appVersion?: string
    /** The app version the last update ran for, kept across launches. */
    updatedFor: Ref<string | null>
    /** Looks the companions up again for the rest of setup. */
    refresh: () => Promise<void>
    /** Restarts the app's MCP server, so the updated one runs. */
    restartBridge: () => Promise<void>
  }
) {
  const appVersion = options.appVersion ?? APP_VERSION
  const state = ref<CompanionUpdateState>('idle')
  let running: Promise<void> | null = null

  async function update(): Promise<void> {
    // Marked before it starts, so an update that fails or quits the app is not tried again.
    options.updatedFor.value = appVersion
    const lookup = await host.detect().catch(() => null)
    if (!lookup) return
    const updates = outdatedCompanions(lookup, appVersion)
    if (!updates.length) return
    state.value = 'updating'
    let failed = false
    for (const { companion, manager } of updates) {
      try {
        await host.install(
          { kind: 'companion', companion },
          { searchPath: lookup.searchPath, manager }
        )
      } catch {
        failed = true
      }
    }
    // Another copy earlier on the search path would still answer with its old version.
    const after = await host.detect().catch(() => null)
    const remaining = after ? outdatedCompanions(after, appVersion) : updates
    if (remaining.some((left) => updates.some((done) => done.companion === left.companion))) {
      failed = true
    }
    await options.refresh().catch(() => undefined)
    if (updates.some((done) => done.companion === 'mcp')) {
      await options.restartBridge().catch((error: unknown) => {
        console.error('[Companions] Could not restart the updated MCP server:', error)
      })
    }
    state.value = failed ? 'failed' : 'updated'
  }

  return {
    state: readonly(state),
    /** Updates outdated companions unless this app version already tried. */
    run(): Promise<void> {
      if (!options.enabled || options.updatedFor.value === appVersion) return Promise.resolve()
      running ??= update().finally(() => {
        running = null
      })
      return running
    },
    /** Resolves once a running update finished, at once when none is running. */
    settled(): Promise<void> {
      return running ?? Promise.resolve()
    }
  }
}

/**
 * The desktop app's companion update, which the workspace starts once the MCP server started.
 * Development, native-test, and test runs leave the person's global packages alone.
 */
export const companionUpdate = createCompanionUpdate(agentHost(), {
  enabled:
    IS_TAURI &&
    !import.meta.env.DEV &&
    import.meta.env.MODE !== 'native-test' &&
    !appRuntimeConfig.test,
  updatedFor: IS_TAURI
    ? useLocalStorage<string | null>('pairdraw:companions-updated-for', null, {
        serializer: StorageSerializers.string,
        writeDefaults: false
      })
    : ref<string | null>(null),
  refresh: () => agentDiscovery.refresh(true),
  restartBridge: restartAppMCPServer
})
