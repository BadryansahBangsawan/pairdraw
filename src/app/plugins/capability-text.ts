import type { PluginCapability } from './schema'

/** Settings message that names each capability, so the panel and the prompt say the same thing. */
export const pluginCapabilityKeys = {
  'document:read': 'pluginsCapabilityDocumentRead',
  'document:write': 'pluginsCapabilityDocumentWrite',
  'filesystem:read': 'pluginsCapabilityFilesystemRead',
  'filesystem:write': 'pluginsCapabilityFilesystemWrite',
  'code:execute': 'pluginsCapabilityCodeExecute',
  'settings:read': 'pluginsCapabilitySettingsRead',
  'settings:write': 'pluginsCapabilitySettingsWrite'
} as const satisfies Record<PluginCapability, string>

export type PluginCapabilityKey = (typeof pluginCapabilityKeys)[PluginCapability]

/**
 * The capabilities this version's host can actually perform. The rest stay ungranted: a plugin
 * may ask for them, and the prompt says they are not available yet.
 */
export const PLUGIN_AVAILABLE_CAPABILITIES = ['document:read', 'document:write'] as const
