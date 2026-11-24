import type { SceneGraph } from '@pairdraw/scene-graph'
import { PAIRDRAW_PLUGIN_DATA, readPluginData } from '@pairdraw/scene-graph/plugin-data'

import { collectSubtrees } from '#core/editor/history/subtree'

import type { ClipboardNodeTree } from './snapshot'

/**
 * The component or set already in this document that a snapshot's dependency becomes, when the
 * dependency came from here before. A node a paste created carries its clipboard origin, and a
 * component read from a `.fig` carries the source identity Figma stores; names are never compared,
 * so an unrelated same-named component is never reused.
 */
export function matchClipboardComponents(
  graph: SceneGraph,
  sourceRootId: string,
  dependencies: ClipboardNodeTree[]
): Map<string, string> {
  const roots = [...graph.getAllNodes()].filter(
    (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
  )
  const byOrigin = new Map<string, string>()
  const bySource = new Map<string, string>()
  const byKey = new Map<string, string>()
  for (const root of roots) {
    const origin = readPluginData(root.pluginData, PAIRDRAW_PLUGIN_DATA.clipboardOrigin)
    if (origin?.documentId === sourceRootId) byOrigin.set(origin.nodeId, root.id)
    if (root.source.id) bySource.set(root.source.id, root.id)
    for (const key of [root.sourceLibraryKey, root.componentKey])
      if (key && !byKey.has(key)) byKey.set(key, root.id)
  }
  const matches = new Map<string, string>()
  const matchedRoots = new Set<string>()

  const mapExistingChildren = (dependency: ClipboardNodeTree, existingRootId: string) => {
    const byChildOrigin = new Map<string, string>()
    const byChildSource = new Map<string, string>()
    for (const node of collectSubtrees(graph, [existingRootId])) {
      const origin = readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.clipboardOrigin)
      if (origin?.documentId === sourceRootId) byChildOrigin.set(origin.nodeId, node.id)
      if (node.source.id) byChildSource.set(node.source.id, node.id)
    }
    const visit = (node: ClipboardNodeTree) => {
      const existing =
        byChildOrigin.get(node.id) ??
        (node.source.id ? byChildSource.get(node.source.id) : undefined)
      if (existing) matches.set(node.id, existing)
      for (const child of node.children ?? []) visit(child)
    }
    for (const child of dependency.children ?? []) visit(child)
  }

  for (const dependency of dependencies) {
    const existing =
      byOrigin.get(dependency.id) ??
      (dependency.sourceLibraryKey ? byKey.get(dependency.sourceLibraryKey) : undefined) ??
      (dependency.componentKey ? byKey.get(dependency.componentKey) : undefined) ??
      (dependency.source.id ? bySource.get(dependency.source.id) : undefined)
    if (!existing || matchedRoots.has(existing)) continue
    matchedRoots.add(existing)
    matches.set(dependency.id, existing)
    mapExistingChildren(dependency, existing)
  }
  return matches
}
