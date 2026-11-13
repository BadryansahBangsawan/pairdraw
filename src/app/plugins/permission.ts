import { shallowRef } from 'vue'

import { PLUGIN_AVAILABLE_CAPABILITIES } from './capability-text'
import { grantPlugin } from './grants'
import type { InstalledPlugin, PluginCapability } from './schema'

/** What the dialog is showing: the plugin, and where its answer goes. */
export interface PluginPermissionRequest {
  plugin: InstalledPlugin
  answer: (grants: PluginCapability[] | null) => void
}

/** The prompt a plugin's first run is waiting on, or `null` when nothing waits. */
export const pendingPluginPermission = shallowRef<PluginPermissionRequest | null>(null)

/**
 * A plugin asks once, before its first run, and only when it asked for something. Disabling it
 * drops its grants and clears the answer, so enabling it again asks again; otherwise a run never
 * prompts a second time.
 */
export function needsPluginPermission(plugin: InstalledPlugin): boolean {
  return plugin.enabled && !plugin.asked && plugin.capabilities.length > 0
}

/** Waits for the person's answer: the grants they allowed, or `null` when they cancelled. */
export function requestPluginPermission(
  plugin: InstalledPlugin
): Promise<PluginCapability[] | null> {
  return new Promise((resolve) => {
    pendingPluginPermission.value = { plugin, answer: resolve }
  })
}

/** The dialog's answer. Cancelling runs nothing and leaves the plugin unanswered. */
export function answerPluginPermission(grants: readonly PluginCapability[] | null): void {
  const request = pendingPluginPermission.value
  if (!request) return
  pendingPluginPermission.value = null
  request.answer(grants ? [...grants] : null)
}
/**
 * The list to run with, once an unanswered plugin has been answered. `null` when the person
 * cancelled: nothing is stored and nothing runs. An answered plugin, or one that asked for
 * nothing, comes back unchanged and is not prompted again.
 */
export async function ensurePluginsAnswered(
  plugins: readonly InstalledPlugin[],
  id: string,
  prompt: (plugin: InstalledPlugin) => Promise<PluginCapability[] | null>
): Promise<InstalledPlugin[] | null> {
  const plugin = plugins.find((item) => item.id === id)
  if (!plugin || !needsPluginPermission(plugin)) return [...plugins]
  const allowed = await prompt(plugin)
  if (!allowed) return null
  const granted = grantPlugin(plugins, id, allowed)
  return granted.ok ? granted.plugins : null
}

/**
 * The capabilities the prompt may offer for one plugin: those it asked for that this host can
 * perform. The rest are listed as not available yet and are never granted.
 */
export function offerableCapabilities(plugin: InstalledPlugin): PluginCapability[] {
  return plugin.capabilities.filter((capability) =>
    PLUGIN_AVAILABLE_CAPABILITIES.some((available) => available === capability)
  )
}
