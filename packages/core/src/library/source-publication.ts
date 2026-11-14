import type { SceneGraph, SourceLibraryPublication } from '@pairdraw/scene-graph'
import {
  PAIRDRAW_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@pairdraw/scene-graph/plugin-data'

export function readSourceLibraryPublication(graph: SceneGraph): SourceLibraryPublication | null {
  const root = graph.getNode(graph.rootId)
  return readPluginData(root?.pluginData, PAIRDRAW_PLUGIN_DATA.sourceLibraryPublication) ?? null
}

export function writeSourceLibraryPublication(
  graph: SceneGraph,
  publication: SourceLibraryPublication
): void {
  const root = graph.getNode(graph.rootId)
  if (!root) return
  graph.updateNode(root.id, {
    pluginData: withPluginData(
      root.pluginData,
      PAIRDRAW_PLUGIN_DATA.sourceLibraryPublication,
      publication
    )
  })
}
