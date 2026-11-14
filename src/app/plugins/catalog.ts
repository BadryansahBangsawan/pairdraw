import { uniq } from 'es-toolkit'
import * as v from 'valibot'

import { MAX_PLUGINS, MAX_PLUGIN_MANIFEST_BYTES } from './limits'
import {
  duplicatePluginMessage,
  PLUGIN_MANIFEST_INVALID_MESSAGE,
  PLUGIN_NETWORK_MESSAGE,
  PLUGIN_TOO_LARGE_MESSAGE,
  PLUGIN_TOO_MANY_MESSAGE,
  unknownCapabilityMessage
} from './messages'
import {
  isPluginCapability,
  pluginManifestSchema,
  type InstalledPlugin,
  type PluginManifest
} from './schema'

const PLUGIN_INSTALL_REASONS = [
  'invalid',
  'duplicate',
  'unknown-capability',
  'network',
  'too-large',
  'too-many'
] as const

type PluginInstallReason = (typeof PLUGIN_INSTALL_REASONS)[number]

export type PluginInstallResult =
  | { ok: true; plugins: InstalledPlugin[] }
  | {
      ok: false
      reason: PluginInstallReason
      message: string
      /** Set for `duplicate`, so a translated message can name the id. */
      id?: string
      /** Set for `unknown-capability`, so a translated message can name it. */
      capability?: string
    }

const jsonValueSchema = v.pipe(v.string(), v.parseJson(), v.unknown())

function refusal(
  reason: PluginInstallReason,
  message: string,
  detail?: { id: string } | { capability: string }
): PluginInstallResult {
  return { ok: false, reason, message, ...detail }
}

function manifestBytes(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Why a capability list cannot be installed, before the rest of the manifest is judged.
 * `network:access` is named on its own so it is not reported as an unknown capability.
 */
function refusedCapabilities(value: unknown): PluginInstallResult | null {
  if (!isRecord(value) || !Array.isArray(value.capabilities)) return null
  for (const capability of value.capabilities) {
    if (capability === 'network:access') return refusal('network', PLUGIN_NETWORK_MESSAGE)
  }
  for (const capability of value.capabilities) {
    if (typeof capability !== 'string' || isPluginCapability(capability)) continue
    return refusal('unknown-capability', unknownCapabilityMessage(capability), { capability })
  }
  return null
}

function toInstalled(manifest: PluginManifest): InstalledPlugin {
  return {
    ...manifest,
    capabilities: uniq(manifest.capabilities),
    enabled: true,
    grants: [],
    asked: false
  }
}

/**
 * Keeps a manifest that parsed. The entry source is copied onto the record as text.
 * This function does not evaluate it, compile it, or import it.
 */
export function installPlugin(
  plugins: readonly InstalledPlugin[],
  text: string
): PluginInstallResult {
  if (manifestBytes(text) > MAX_PLUGIN_MANIFEST_BYTES) {
    return refusal('too-large', PLUGIN_TOO_LARGE_MESSAGE)
  }
  const json = v.safeParse(jsonValueSchema, text)
  if (!json.success) return refusal('invalid', PLUGIN_MANIFEST_INVALID_MESSAGE)
  const capabilities = refusedCapabilities(json.output)
  if (capabilities) return capabilities
  const manifest = v.safeParse(pluginManifestSchema, json.output)
  if (!manifest.success) return refusal('invalid', PLUGIN_MANIFEST_INVALID_MESSAGE)
  if (plugins.length >= MAX_PLUGINS) return refusal('too-many', PLUGIN_TOO_MANY_MESSAGE)
  if (plugins.some((plugin) => plugin.id === manifest.output.id)) {
    return refusal('duplicate', duplicatePluginMessage(manifest.output.id), {
      id: manifest.output.id
    })
  }
  return { ok: true, plugins: [...plugins, toInstalled(manifest.output)] }
}

/** A chosen file. The size is checked before the bytes are read as text. */
export async function installPluginFile(
  plugins: readonly InstalledPlugin[],
  file: Blob
): Promise<PluginInstallResult> {
  if (file.size > MAX_PLUGIN_MANIFEST_BYTES) return refusal('too-large', PLUGIN_TOO_LARGE_MESSAGE)
  return installPlugin(plugins, await file.text())
}

export function setPluginEnabled(
  plugins: readonly InstalledPlugin[],
  id: string,
  enabled: boolean
): readonly InstalledPlugin[] {
  if (!plugins.some((plugin) => plugin.id === id)) return plugins
  return plugins.map((plugin) => {
    if (plugin.id !== id) return plugin
    // Disabling drops grants. Enabling again does not bring them back, so the
    // permission prompt comes back with them.
    if (!enabled) return { ...plugin, enabled: false, grants: [], asked: false }
    return { ...plugin, enabled: true }
  })
}

export function removePlugin(
  plugins: readonly InstalledPlugin[],
  id: string
): readonly InstalledPlugin[] {
  if (!plugins.some((plugin) => plugin.id === id)) return plugins
  return plugins.filter((plugin) => plugin.id !== id)
}
