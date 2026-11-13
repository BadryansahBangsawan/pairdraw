import { useLocalStorage } from '@vueuse/core'

import { installPlugin, installPluginFile, removePlugin, setPluginEnabled } from './catalog'
import type { PluginInstallResult } from './catalog'
import { grantPlugin, type PluginGrantResult } from './grants'
import type { InstalledPlugin } from './schema'
import { readStoredPlugins, writeStoredPlugins } from './storage'

/**
 * App-level plugin list. Desktop and the browser both keep it in `localStorage`
 * under this key, the same way as other app preferences. It is not stored in a document.
 */
const STORAGE_KEY = 'open-pencil:plugins'

export const installedPlugins = useLocalStorage<InstalledPlugin[]>(STORAGE_KEY, [], {
  serializer: { read: readStoredPlugins, write: writeStoredPlugins }
})

export function installPastedPlugin(text: string): PluginInstallResult {
  const result = installPlugin(installedPlugins.value, text)
  if (result.ok) installedPlugins.value = result.plugins
  return result
}

export async function installChosenPluginFile(file: Blob): Promise<PluginInstallResult> {
  const result = await installPluginFile(installedPlugins.value, file)
  if (result.ok) installedPlugins.value = result.plugins
  return result
}

export function setInstalledPluginEnabled(id: string, enabled: boolean): void {
  installedPlugins.value = [...setPluginEnabled(installedPlugins.value, id, enabled)]
}

export function removeInstalledPlugin(id: string): void {
  installedPlugins.value = [...removePlugin(installedPlugins.value, id)]
}

export function grantInstalledPlugin(
  id: string,
  capabilities: readonly string[]
): PluginGrantResult {
  const result = grantPlugin(installedPlugins.value, id, capabilities)
  if (result.ok) installedPlugins.value = result.plugins
  return result
}

function copyInstalledPlugin(plugin: InstalledPlugin): InstalledPlugin {
  return {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    source: plugin.source,
    command: plugin.command,
    capabilities: [...plugin.capabilities],
    enabled: plugin.enabled,
    grants: [...plugin.grants],
    asked: plugin.asked
  }
}

/** A copy the settings story restores after it installs and removes plugins. */
export function installedPluginsSnapshot(): InstalledPlugin[] {
  return installedPlugins.value.map(copyInstalledPlugin)
}

export function replaceInstalledPlugins(plugins: readonly InstalledPlugin[]): void {
  installedPlugins.value = plugins.map(copyInstalledPlugin)
}
