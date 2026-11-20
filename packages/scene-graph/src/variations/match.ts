import { groupBy } from 'es-toolkit'

import type { SceneGraph } from '../graph'
import { readPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { SceneNode } from '../types'

/**
 * Which layer of the original each layer of a version stands for, as version id → original id.
 * The roots always pair. Under each paired parent, children pair first by type and name in
 * order, then the ones left by type in order, so a renamed or moved layer still finds its
 * counterpart; layers of different types never pair, except a main component's or component
 * set's stand-in, marked as such (`standsIn`), which pairs with it; a marked layer that does
 * not find its component here pairs as any other layer. Only layers paired with their own type are
 * searched further. Nothing is stored: a version is a copy of the original, so its layers mostly
 * keep the names and types they were copied with.
 */
export function matchLayers(
  graph: SceneGraph,
  originalId: string,
  versionId: string
): Map<string, string> {
  const pairs = new Map<string, string>([[versionId, originalId]])
  const pending: Array<[string, string]> = [[versionId, originalId]]
  for (let next = pending.pop(); next; next = pending.pop()) {
    const [versionParent, originalParent] = next
    for (const [version, original] of matchChildren(
      graph.getChildren(versionParent),
      graph.getChildren(originalParent)
    )) {
      pairs.set(version.id, original.id)
      if (version.type === original.type) pending.push([version.id, original.id])
    }
  }
  return pairs
}

/**
 * Whether `version` is what a copy holds in place of the main component or component set
 * `original`, as its mark says (`copyVersion`): an instance of the component, or a frame of
 * instances of the set's variants. A name proves nothing, since an instance may share it.
 */
export function standsIn(version: SceneNode, original: SceneNode): boolean {
  if (original.type !== 'COMPONENT' && original.type !== 'COMPONENT_SET') return false
  return readPluginData(version.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn) === original.id
}

/** Takes the next free layer of a bucket, skipping ones another bucket already gave away. */
function takeNext(
  bucket: readonly SceneNode[] | undefined,
  cursors: Map<readonly SceneNode[], number>,
  taken: Set<string>
): SceneNode | undefined {
  if (!bucket) return undefined
  let index = cursors.get(bucket) ?? 0
  while (index < bucket.length && taken.has(bucket[index].id)) index++
  cursors.set(bucket, Math.min(index + 1, bucket.length))
  if (index === bucket.length) return undefined
  const found = bucket[index]
  taken.add(found.id)
  return found
}

/**
 * Pairs in one pass over each list: stand-ins for main components and sets first, then through
 * buckets by type and name and by type alone.
 */
function matchChildren(
  versions: SceneNode[],
  originals: SceneNode[]
): Array<[SceneNode, SceneNode]> {
  const mains = new Map(
    originals
      .filter((node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET')
      .map((node) => [node.id, node])
  )
  const byName = groupBy(originals, (node) => `${node.type}\u0000${node.name}`)
  const byType = groupBy(originals, (node) => node.type)
  const cursors = new Map<readonly SceneNode[], number>()
  const taken = new Set<string>()
  const pairs: Array<[SceneNode, SceneNode]> = []
  const left: SceneNode[] = []
  for (const version of versions) {
    const mainId = readPluginData(version.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn)
    const main = mainId === undefined ? undefined : mains.get(mainId)
    if (main && !taken.has(main.id) && standsIn(version, main)) {
      taken.add(main.id)
      pairs.push([version, main])
      continue
    }
    const named = takeNext(byName[`${version.type}\u0000${version.name}`], cursors, taken)
    if (named) pairs.push([version, named])
    else left.push(version)
  }
  for (const version of left) {
    const typed = takeNext(byType[version.type], cursors, taken)
    if (typed) pairs.push([version, typed])
  }
  return pairs
}
