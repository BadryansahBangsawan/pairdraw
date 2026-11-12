import * as v from 'valibot'

import { MAX_PLUGINS } from './limits'
import { installedPluginSchema, storedPluginCatalogSchema, type InstalledPlugin } from './schema'

const storedJSONSchema = v.pipe(v.string(), v.parseJson(), v.unknown())

/**
 * Plugins saved for this app. One entry this version cannot read is dropped.
 * A list longer than the install limit is cut down to that limit.
 */
export function readStoredPlugins(raw: string): InstalledPlugin[] {
  const json = v.safeParse(storedJSONSchema, raw)
  if (!json.success) return []
  const catalog = v.safeParse(storedPluginCatalogSchema, json.output)
  if (!catalog.success) return []
  const plugins: InstalledPlugin[] = []
  for (const entry of catalog.output.plugins) {
    const plugin = v.safeParse(installedPluginSchema, entry)
    if (!plugin.success) continue
    plugins.push(plugin.output)
    if (plugins.length === MAX_PLUGINS) break
  }
  return plugins
}

export function writeStoredPlugins(plugins: readonly InstalledPlugin[]): string {
  return JSON.stringify({ version: 1 as const, plugins })
}
