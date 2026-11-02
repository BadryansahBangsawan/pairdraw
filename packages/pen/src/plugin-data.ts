import type { PluginDataEntry, SceneNode } from '@open-pencil/scene-graph'

import type { PenNode } from './schema'

/**
 * The shared plugin data namespace that keeps the pen.dev fields a layer has no field for, so
 * agents can read them with `getSharedPluginData('pen', key)` and a `.pen` writer can write them
 * back. Each value is its field's JSON.
 */
export const PEN_PLUGIN_DATA_NAMESPACE = 'pen'

/**
 * The pen.dev fields kept as plugin data: notes for agents (`context`, `metadata`), the frame an
 * agent is working on (`placeholder`), the components suggested for a slot (`slot`), and what a
 * `prompt` or `context` node was, with the model a prompt asks.
 */
const PEN_PLUGIN_DATA_KEYS = [
  'type',
  'context',
  'metadata',
  'placeholder',
  'slot',
  'model'
] as const

type PenPluginDataKey = (typeof PEN_PLUGIN_DATA_KEYS)[number]

/** Node types kept as plugin data on the layer they become. */
const KEPT_TYPES: ReadonlySet<string> = new Set(['prompt', 'context'])

/** As `setSharedPluginData` stores an entry, so the Figma API reads and replaces it. */
function entry(key: PenPluginDataKey, value: unknown): PluginDataEntry {
  return {
    pluginId: PEN_PLUGIN_DATA_NAMESPACE,
    key: `${PEN_PLUGIN_DATA_NAMESPACE}/${key}`,
    value: JSON.stringify(value)
  }
}

function penEntries(pen: PenNode): PluginDataEntry[] {
  return PEN_PLUGIN_DATA_KEYS.flatMap((key) => {
    if (key === 'type') return KEPT_TYPES.has(pen.type) ? [entry(key, pen.type)] : []
    const value = pen[key]
    return value === undefined ? [] : [entry(key, value)]
  })
}

/**
 * Replaces the layer's pen.dev plugin data with the fields `pen` carries, keeping every other
 * entry, so applying a layer's fields again with an override's merged in leaves one of each.
 */
export function applyPenPluginData(node: SceneNode, pen: PenNode): void {
  const others = node.pluginData.filter((item) => item.pluginId !== PEN_PLUGIN_DATA_NAMESPACE)
  const own = penEntries(pen)
  if (own.length === 0 && others.length === node.pluginData.length) return
  node.pluginData = [...others, ...own]
}
