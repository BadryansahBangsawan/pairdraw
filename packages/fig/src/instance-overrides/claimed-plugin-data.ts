import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import { PAIRDRAW_PLUGIN_DATA, PAIRDRAW_PLUGIN_ID } from '@pairdraw/scene-graph/plugin-data'

const { primaryAxisAlign } = PAIRDRAW_PLUGIN_DATA

/**
 * Drop the space-around plugin data a layer inherited from its component when a claim sets
 * Figma's own justify field and brings no plugin data: the claimed alignment is the instance's.
 */
export function invalidateInheritedPluginData(
  source: NodeChange,
  patch: Record<string, unknown>
): void {
  if ('pluginData' in patch || !source.pluginData) return
  if (!('stackPrimaryAlignItems' in patch) && !('stackJustify' in patch)) return
  source.pluginData = source.pluginData.filter(
    (entry) => entry.pluginID !== PAIRDRAW_PLUGIN_ID || entry.key !== primaryAxisAlign.key
  )
}
