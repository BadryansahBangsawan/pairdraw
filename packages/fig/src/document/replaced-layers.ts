import { isValid, toUint8Array } from 'js-base64'

import { decodeMessage, type NodeChange } from '@open-pencil/kiwi/fig/codec'
import { guidToString, stringToGuid } from '@open-pencil/kiwi/fig/guid'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import {
  isInShownReplacedLayer,
  isReplacedLayer,
  owningInstance,
  replaceInstanceLayer
} from '@open-pencil/scene-graph/instances'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

import { nodeChangeToProps } from '../node-change'
import { instanceExportAddress } from '../node-change/instance/geometry'

interface ReplacedLayerContext {
  graph: SceneGraph
  blobs: Uint8Array[]
  /** The layer each record became, by record GUID. */
  sources: ReadonlyMap<string, string>
}

/** The records a stored replacement was written as, or null when they cannot be read. */
function storedRecords(value: string): NodeChange[] | null {
  if (!isValid(value)) return null
  try {
    const records = decodeMessage(toUint8Array(value)).nodeChanges
    return records && records.length > 0 ? records : null
  } catch {
    return null
  }
}

/** The layer of `instance` an override with this GUID path would address. */
function addressedLayer(
  context: ReplacedLayerContext,
  instance: SceneNode,
  path: readonly string[]
): SceneNode | undefined {
  const recordOf = new Map([...context.sources].map(([record, id]) => [id, record]))
  const resolveGuid = (id: string) => stringToGuid(recordOf.get(id) ?? id)
  const wanted = path.join('/')
  const visit = (node: SceneNode): SceneNode | undefined => {
    for (const child of context.graph.getChildren(node.id)) {
      if (isInShownReplacedLayer(context.graph, child.id)) continue
      const address = instanceExportAddress(context.graph, instance, child, resolveGuid)
      if (address?.map(guidToString).join('/') === wanted) return child
      const found = visit(child)
      if (found) return found
    }
    return undefined
  }
  return visit(instance)
}

/** The component an instance record shows, when the document has it. */
function recordComponent(context: ReplacedLayerContext, record: NodeChange): string | undefined {
  const symbol = record.symbolData?.symbolID
  const id = symbol ? context.sources.get(guidToString(symbol)) : undefined
  return id && context.graph.getNode(id)?.type === 'COMPONENT' ? id : undefined
}

/**
 * Builds a replacement's layers from its records under `parentId`, parents first; an instance
 * among them shows its component as the component is, without overrides of its own, and one
 * whose component the document lacks becomes an empty frame.
 */
function buildRecords(
  context: ReplacedLayerContext,
  records: readonly NodeChange[],
  parentId: string
): string | undefined {
  const { graph } = context
  const layers = new Map<string, string>()
  let rootId: string | undefined
  for (const record of records) {
    if (!record.guid) continue
    const recordParent = record.parentIndex?.guid
    const parent = rootId ? recordParent && layers.get(guidToString(recordParent)) : parentId
    if (!parent) continue
    const { nodeType, ...props } = nodeChangeToProps(record, context.blobs)
    if (nodeType === 'DOCUMENT' || nodeType === 'VARIABLE' || nodeType === 'CANVAS') continue
    const componentId = nodeType === 'INSTANCE' ? recordComponent(context, record) : undefined
    const instance = componentId ? graph.createInstance(componentId, parent, props) : null
    const node =
      nodeType !== 'INSTANCE'
        ? graph.createNode(nodeType, parent, props)
        : (instance ?? graph.createNode('FRAME', parent, { ...props, componentId: null }))
    layers.set(guidToString(record.guid), node.id)
    rootId ??= node.id
  }
  return rootId
}

/**
 * Puts back the layers instances showed in place of their components' layers, which the
 * instances' records carry as plugin data, and drops that plugin data: the layers and the
 * instances' overrides hold it from here on. An entry whose layer or records are gone is skipped.
 * Only an instance with a record of its own carries entries; one inside another instance holds a
 * copy of its definition's, whose replacements a sync copies with the definition's other layers.
 */
export function applyStoredReplacedLayers(
  context: ReplacedLayerContext,
  nodes: readonly SceneNode[]
): void {
  const field = OPEN_PENCIL_PLUGIN_DATA.replacedLayers
  for (const instance of nodes) {
    if (instance.type !== 'INSTANCE') continue
    const stored = readPluginData(instance.pluginData, field)
    if (!stored) continue
    context.graph.updateNode(instance.id, {
      pluginData: withPluginData(instance.pluginData, field, undefined)
    })
    if (owningInstance(context.graph, instance)) continue
    for (const { path, records } of stored) {
      const target = addressedLayer(context, instance, path)
      const decoded = storedRecords(records)
      if (!target?.parentId || !decoded) continue
      const rootId = buildRecords(context, decoded, target.parentId)
      if (rootId && !replaceInstanceLayer(context.graph, target.id, rootId))
        context.graph.deleteNode(rootId)
    }
  }
}

/**
 * Syncs the instances among `nodes` whose components show a replaced layer, their own or a
 * nested component's, which the instances' records hold as the component layer it replaced.
 * Instances inside a definition sync before the instances of that definition. Returns whether
 * any instance was synced.
 */
export function syncInstancesOfReplacingComponents(
  graph: SceneGraph,
  nodes: readonly SceneNode[]
): boolean {
  /** How deeply a component nests other components, with whether one of them replaces a layer. */
  const ranks = new Map<string, { depth: number; replaces: boolean } | null>()
  const rank = (componentId: string): { depth: number; replaces: boolean } => {
    const known = ranks.get(componentId)
    if (known) return known
    // A component met again while it is ranked nests itself; it counts as nesting nothing.
    if (known === null) return { depth: 0, replaces: false }
    ranks.set(componentId, null)
    let depth = 0
    let replaces = false
    const visit = (id: string) => {
      for (const child of graph.getChildren(id)) {
        if (isReplacedLayer(graph, child)) replaces = true
        if (child.type === 'INSTANCE' && child.componentId) {
          const nested = rank(child.componentId)
          depth = Math.max(depth, nested.depth + 1)
          replaces ||= nested.replaces
        }
        visit(child.id)
      }
    }
    visit(componentId)
    const result = { depth, replaces }
    ranks.set(componentId, result)
    return result
  }
  const instances = nodes.filter(
    (node) =>
      node.type === 'INSTANCE' &&
      node.componentId !== null &&
      !owningInstance(graph, node) &&
      rank(node.componentId).replaces
  )
  const depthOf = (node: SceneNode) => (node.componentId ? rank(node.componentId).depth : 0)
  for (const instance of instances.sort((a, b) => depthOf(a) - depthOf(b)))
    graph.syncInstance(instance.id)
  return instances.length > 0
}
