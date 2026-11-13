import { uniq } from 'es-toolkit'

import type { ToolCapability } from '@open-pencil/core/tools'

import {
  PLUGIN_GRANT_DISABLED_MESSAGE,
  pluginGrantMissingMessage,
  pluginGrantNotRequestedMessage
} from './messages'
import { isPluginCapability, type InstalledPlugin, type PluginCapability } from './schema'

export const PLUGIN_GRANT_REASONS = ['missing', 'disabled', 'not-requested'] as const

export type PluginGrantReason = (typeof PLUGIN_GRANT_REASONS)[number]

export type PluginGrantResult =
  | { ok: true; plugins: InstalledPlugin[] }
  | { ok: false; reason: PluginGrantReason; message: string }

/**
 * Replaces the grants stored on one enabled plugin. Every capability has to be one the
 * manifest asked for, so a grant for anything else, including `network:access`, is refused
 * and the stored grants stay as they were.
 */
export function grantPlugin(
  plugins: readonly InstalledPlugin[],
  id: string,
  capabilities: readonly string[]
): PluginGrantResult {
  const plugin = plugins.find((item) => item.id === id)
  if (!plugin) return { ok: false, reason: 'missing', message: pluginGrantMissingMessage(id) }
  if (!plugin.enabled) {
    return { ok: false, reason: 'disabled', message: PLUGIN_GRANT_DISABLED_MESSAGE }
  }
  const grants: PluginCapability[] = []
  for (const capability of capabilities) {
    if (!isPluginCapability(capability) || !plugin.capabilities.includes(capability)) {
      return {
        ok: false,
        reason: 'not-requested',
        message: pluginGrantNotRequestedMessage(capability)
      }
    }
    grants.push(capability)
  }
  const next = uniq(grants)
  return {
    ok: true,
    plugins: plugins.map((item) => (item.id === id ? { ...item, grants: next, asked: true } : item))
  }
}

/**
 * What the future host calls before it performs a plugin call. Allowed only when that
 * plugin is enabled and the capability is among the grants stored for it.
 */
export function authorizePluginCall(
  plugins: readonly InstalledPlugin[],
  id: string,
  capability: ToolCapability
): 'allowed' | 'denied' {
  if (capability === 'network:access') return 'denied'
  const plugin = plugins.find((item) => item.id === id)
  if (!plugin?.enabled) return 'denied'
  return plugin.grants.some((grant) => grant === capability) ? 'allowed' : 'denied'
}
