import type { PluginDataEntry, SceneNode } from '@open-pencil/scene-graph'

import type { PenNode, PenOverride } from './schema'

/**
 * The shared plugin data namespace that keeps the pen.dev fields a layer has no field for, so
 * agents can read them with `getSharedPluginData('pen', key)` and a `.pen` writer can write them
 * back. Each value is its field's JSON.
 */
export const PEN_PLUGIN_DATA_NAMESPACE = 'pen'

/**
 * The pen.dev fields kept as plugin data: notes for agents (`context`, `metadata`), the frame an
 * agent is working on (`placeholder`), the components suggested for a slot (`slot`), and what a
 * `prompt` or `context` node was, with the model a prompt asks. A `script` or `browser` node, which
 * reads as a placeholder frame, keeps its file and inputs or its page and view; a `ref` whose
 * component could not be found keeps the ID it names; and a label a placeholder was given says so.
 */
const PEN_PLUGIN_DATA_KEYS = [
  'type',
  'ref',
  'context',
  'metadata',
  'placeholder',
  'slot',
  'model',
  'scriptUri',
  'inputs',
  'url',
  'deviceId',
  'zoom',
  'scrollX',
  'scrollY',
  'generated'
] as const

type PenPluginDataKey = (typeof PEN_PLUGIN_DATA_KEYS)[number]

/** Node types kept as plugin data on the layer they become. */
const KEPT_TYPES: ReadonlySet<string> = new Set(['prompt', 'context', 'script', 'browser'])

/**
 * The field a `ref` whose component is missing reads with, holding the ID it names: the layer is a
 * placeholder frame, and keeps being a `ref` as plugin data.
 */
export const UNRESOLVED_REF = 'unresolvedRef'

/** The ID a placeholder for a missing component names, or undefined for any other layer. */
export function unresolvedRef(pen: PenOverride): string | undefined {
  const ref = pen[UNRESOLVED_REF]
  return typeof ref === 'string' ? ref : undefined
}

/** As `setSharedPluginData` stores an entry, so the Figma API reads and replaces it. */
function entry(key: PenPluginDataKey, value: unknown): PluginDataEntry {
  return {
    pluginId: PEN_PLUGIN_DATA_NAMESPACE,
    key: `${PEN_PLUGIN_DATA_NAMESPACE}/${key}`,
    value: JSON.stringify(value)
  }
}

function penEntries(pen: PenNode): PluginDataEntry[] {
  const missing = unresolvedRef(pen)
  return PEN_PLUGIN_DATA_KEYS.flatMap((key) => {
    if (key === 'type') {
      if (missing !== undefined) return [entry(key, 'ref')]
      return KEPT_TYPES.has(pen.type) ? [entry(key, pen.type)] : []
    }
    // A resolved `ref` is an instance, which says what it shows itself.
    if (key === 'ref') return missing === undefined ? [] : [entry(key, missing)]
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
