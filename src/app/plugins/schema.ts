import { uniq } from 'es-toolkit'
import * as v from 'valibot'

import type { ToolCapability } from '@open-pencil/core/tools'

import { PLUGIN_AVAILABLE_CAPABILITIES } from './capability-text'
import { MAX_PLUGIN_MANIFEST_BYTES } from './limits'

/**
 * Capabilities a plugin may ask for. `network:access` is a tool capability and is left out:
 * this version refuses it at install instead of granting a host proxy.
 */
export const PLUGIN_CAPABILITIES = [
  'document:read',
  'document:write',
  'filesystem:read',
  'filesystem:write',
  'code:execute',
  'settings:read',
  'settings:write'
] as const satisfies readonly Exclude<ToolCapability, 'network:access'>[]

export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number]

export function isPluginCapability(value: string): value is PluginCapability {
  for (const capability of PLUGIN_CAPABILITIES) {
    if (capability === value) return true
  }
  return false
}

const pluginCapabilitySchema = v.picklist(PLUGIN_CAPABILITIES)

const pluginIdSchema = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(64),
  v.regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
)

const pluginLabelSchema = (max: number) =>
  v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max))

/** The manifest a person pastes or picks. The source is text; nothing here runs it. */
export const pluginManifestSchema = v.strictObject({
  id: pluginIdSchema,
  name: pluginLabelSchema(80),
  version: pluginLabelSchema(32),
  source: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_PLUGIN_MANIFEST_BYTES)),
  /** The single command label the plugin offers in the app's command palette. */
  command: pluginLabelSchema(80),
  capabilities: v.pipe(v.array(pluginCapabilitySchema), v.maxLength(PLUGIN_CAPABILITIES.length))
})

export type PluginManifest = v.InferOutput<typeof pluginManifestSchema>

/**
 * One installed plugin as the app stores it. `enabled` is not part of the manifest.
 * Grants name only capabilities the manifest asked for and this host can perform. A missing
 * list is none. A stored grant this version does not know, including `network:access` and the
 * capabilities the prompt lists as unavailable, is dropped.
 * `asked` records that the person answered the permission prompt, so it is shown once.
 */
export const installedPluginSchema = v.pipe(
  v.object({
    ...pluginManifestSchema.entries,
    enabled: v.boolean(),
    grants: v.optional(v.array(v.string()), []),
    asked: v.optional(v.boolean(), false)
  }),
  v.transform((plugin) => ({
    ...plugin,
    capabilities: uniq(plugin.capabilities),
    grants: uniq(plugin.grants).filter(
      (grant): grant is PluginCapability =>
        isPluginCapability(grant) &&
        plugin.capabilities.includes(grant) &&
        PLUGIN_AVAILABLE_CAPABILITIES.some((available) => available === grant)
    )
  }))
)

export type InstalledPlugin = v.InferOutput<typeof installedPluginSchema>

/** The `localStorage` document. Unknown plugin entries are dropped one by one, not the whole list. */
export const storedPluginCatalogSchema = v.object({
  version: v.literal(1),
  plugins: v.array(v.unknown())
})
