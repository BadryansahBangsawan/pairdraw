import type { SceneGraph } from '../graph'
import { readPluginData, withPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { SceneNode } from '../types'
import type { VariationSet } from './schema'

/** A set of variations as the document holds it now. */
export interface VariationSetView {
  /** The section holding the versions, which carries the set's mark. */
  section: SceneNode
  set: VariationSet
  /** The layer the versions are variations of, or null when it is gone. */
  original: SceneNode | null
  /** The section's children, in their order. */
  versions: SceneNode[]
}

/** The set a section marks, or null when the layer is not a section or carries none. */
export function readVariationSet(
  node: Pick<SceneNode, 'type' | 'pluginData'>
): VariationSet | null {
  if (node.type !== 'SECTION') return null
  return readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.variationSet) ?? null
}

/** The section's plugin data with its mark replaced by `set`, or removed when it is null. */
export function withVariationSet(
  node: Pick<SceneNode, 'pluginData'>,
  set: VariationSet | null
): SceneNode['pluginData'] {
  return withPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.variationSet, set ?? undefined)
}

function viewOf(graph: SceneGraph, section: SceneNode): VariationSetView | null {
  const set = readVariationSet(section)
  if (!set) return null
  const original = graph.getNode(set.originalId) ?? null
  const usable =
    original !== null &&
    original.type !== 'CANVAS' &&
    graph.pageOf(original.id) !== null &&
    !graph.isDescendant(original.id, section.id)
  return {
    section,
    set,
    original: usable ? original : null,
    versions: graph.getChildren(section.id)
  }
}

/** The set a layer belongs to: the marked section itself, one of its versions, or a layer inside one. */
export function variationSetOf(graph: SceneGraph, nodeId: string): VariationSetView | null {
  const section = graph.closest(nodeId, (node) => readVariationSet(node) !== null)
  return section ? viewOf(graph, section) : null
}

/** The version of `view` that holds `nodeId`, or the version itself; null outside its versions. */
export function versionOf(
  graph: SceneGraph,
  view: VariationSetView,
  nodeId: string
): SceneNode | null {
  return graph.closest(nodeId, (node) => node.parentId === view.section.id) ?? null
}

/** The sets on a page; they sit on the page itself, beside the layers they vary. */
export function variationSetsOnPage(graph: SceneGraph, pageId: string): VariationSetView[] {
  return graph.getChildren(pageId).flatMap((node) => viewOf(graph, node) ?? [])
}

/** The set whose versions vary `originalId`, if there is one on its page. */
export function variationSetForOriginal(
  graph: SceneGraph,
  originalId: string
): VariationSetView | null {
  const pageId = graph.pageOf(originalId)
  if (!pageId) return null
  return variationSetsOnPage(graph, pageId).find((view) => view.original?.id === originalId) ?? null
}

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

function hashText(hash: number, text: string): number {
  let next = hash
  for (let index = 0; index < text.length; index++) {
    next = Math.imul(next ^ text.charCodeAt(index), FNV_PRIME) >>> 0
  }
  return next
}

/**
 * A short hash of what a layer and its layers look like at a glance: their types, names, boxes,
 * visibility, opacity, text, and how many fills and children they have. The layer's own position
 * is left out, so moving it, or its auto layout parent placing it, is no change. It walks the
 * whole subtree, so callers compute it when they show it rather than on every edit; it changes
 * with most edits, which is all a "changed since" notice needs, and is not a full comparison.
 */
export function variationFingerprint(graph: SceneGraph, nodeId: string): string {
  let hash = FNV_OFFSET
  const pending = [nodeId]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const node = graph.getNode(id)
    if (!node) continue
    hash = hashText(
      hash,
      [
        node.type,
        node.name,
        id === nodeId ? '' : node.x,
        id === nodeId ? '' : node.y,
        node.width,
        node.height,
        node.rotation,
        node.visible,
        node.opacity,
        node.text,
        node.fills.length,
        node.childIds.length
      ].join('\u0000')
    )
    pending.push(...node.childIds)
  }
  return hash.toString(16).padStart(8, '0')
}

/** Whether the set's original looks different from when its versions were made. */
export function originalChangedSince(graph: SceneGraph, view: VariationSetView): boolean {
  const { original, set } = view
  if (!original || set.originalFingerprint === undefined) return false
  return variationFingerprint(graph, original.id) !== set.originalFingerprint
}
