import * as v from 'valibot'

import { hasPluginData, readPluginData, withPluginData } from '../plugin-data/field'
import { OPEN_PENCIL_PLUGIN_DATA } from '../plugin-data/fields'
import type { PluginDataEntry, SceneNode } from '../types'
import { browserNodeSchema, type BrowserNodeRecord } from './schema'

const field = OPEN_PENCIL_PLUGIN_DATA.browserNode

/** The snapshot a layer stores, or null when it has none or the address is not a page. */
export function readBrowserNode(node: Pick<SceneNode, 'pluginData'>): BrowserNodeRecord | null {
  return readPluginData(node.pluginData, field) ?? null
}

/**
 * Plugin data with this snapshot, or without it when `record` is null or not a page snapshot.
 * The picture stays in the layer's image fill either way.
 */
export function withBrowserNode(
  node: Pick<SceneNode, 'pluginData'>,
  record: BrowserNodeRecord | null
): SceneNode['pluginData'] {
  const parsed = record === null ? null : v.safeParse(browserNodeSchema, record)
  return withPluginData(node.pluginData, field, parsed?.success ? parsed.output : undefined)
}

/**
 * Plugin data as a file should open it. A browser snapshot whose address is not an http or
 * https page is removed, and the layer's image is left alone. Nothing here loads a page.
 */
export function settleBrowserNodeData(entries: readonly PluginDataEntry[]): PluginDataEntry[] {
  const stored = [...entries]
  if (!hasPluginData(stored, field) || readPluginData(stored, field)) return stored
  return withPluginData(stored, field, undefined)
}
