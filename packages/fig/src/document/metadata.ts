import type { NodeChange } from '@pairdraw/kiwi/fig/codec'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { PAIRDRAW_PLUGIN_DATA } from '@pairdraw/scene-graph/plugin-data'

import { readNodeChangePluginData } from '../node-change/plugin-data'

export function applyDocumentMetadata(graph: SceneGraph, document: NodeChange | undefined): void {
  const root = graph.getNode(graph.rootId)
  if (!root || !document) return
  root.source.format = 'fig'
  root.pluginData =
    document.pluginData?.map((entry) => ({
      pluginId: entry.pluginID,
      key: entry.key,
      value: entry.value
    })) ?? []
  root.source.fig.rawNodeFields = {
    ...root.source.fig.rawNodeFields,
    strokeJoin: document.strokeJoin,
    strokeWeight: document.strokeWeight
  }
  const bindings = readNodeChangePluginData(document, PAIRDRAW_PLUGIN_DATA.enabledLibraries)
  for (const binding of bindings ?? []) graph.enabledLibraries.set(binding.libraryId, binding)
}
