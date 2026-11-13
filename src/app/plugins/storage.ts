import * as v from 'valibot'

import { MAX_PLUGINS } from './limits'
import { installedPluginSchema, storedPluginCatalogSchema, type InstalledPlugin } from './schema'

const storedJSONSchema = v.pipe(v.string(), v.parseJson(), v.unknown())

/**
 * Plugins saved for this app. One entry this version cannot read is dropped, and so is a later
 * entry with an id already kept: install refuses a duplicate, so a stored file that holds one
 * did not come from it. A list longer than the install limit is cut down to that limit.
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
    if (plugins.some((kept) => kept.id === plugin.output.id)) continue
    plugins.push(plugin.output)
    if (plugins.length === MAX_PLUGINS) break
  }
  return plugins
}

export function writeStoredPlugins(plugins: readonly InstalledPlugin[]): string {
  return JSON.stringify({ version: 1 as const, plugins })
}
