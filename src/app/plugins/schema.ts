import * as v from 'valibot'

import type { ToolCapability } from '@open-pencil/core/tools'

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
  /** The single toolbar command label the host will show once plugins can run. */
  command: pluginLabelSchema(80),
  capabilities: v.pipe(v.array(pluginCapabilitySchema), v.maxLength(PLUGIN_CAPABILITIES.length))
})

export type PluginManifest = v.InferOutput<typeof pluginManifestSchema>

/** One installed plugin as the app stores it. `enabled` is not part of the manifest. */
export const installedPluginSchema = v.object({
  ...pluginManifestSchema.entries,
  enabled: v.boolean()
})

export type InstalledPlugin = v.InferOutput<typeof installedPluginSchema>

/** The `localStorage` document. Unknown plugin entries are dropped one by one, not the whole list. */
export const storedPluginCatalogSchema = v.object({
  version: v.literal(1),
  plugins: v.array(v.unknown())
})
