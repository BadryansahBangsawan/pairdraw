import { fromUint8Array } from 'js-base64'

import { getCompiledSchema, isCodecReady } from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type { SceneNode } from '@open-pencil/scene-graph'
import {
  isReplacedLayer,
  owningInstance,
  replacedComponentLayerId,
  showsReplacedLayer
} from '@open-pencil/scene-graph/instances'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'
import type { StoredReplacedLayer } from '@open-pencil/scene-graph/plugin-data'

import { nameImagesForFigma } from '../images'
import { definitionSource, instanceExportAddress } from '../instance/geometry'
import { instanceGuidResolver, type SceneNodeToKiwiContext } from './context'

/**
 * The replaced layers in an instance, nested instances' included, outside other replaced layers.
 * A copy of a replaced layer of the component comes back with the component's own, so it and
 * its layers are left out.
 */
function replacedLayers(context: SceneNodeToKiwiContext, instance: SceneNode): SceneNode[] {
  const found: SceneNode[] = []
  const visit = (node: SceneNode) => {
    for (const child of context.graph.getChildren(node.id)) {
      if (isReplacedLayer(context.graph, child)) found.push(child)
      else if (!showsReplacedLayer(context.graph, child)) visit(child)
    }
  }
  visit(instance)
  return found
}

/**
 * Where a replaced layer sits, as the GUID path an override of the layer it replaced would use:
 * the nested instances down to the one that recorded it, then the component layer itself.
 */
function replacedLayerPath(
  context: SceneNodeToKiwiContext,
  instance: SceneNode,
  layer: SceneNode,
  counter: { value: number }
): string[] | null {
  const resolveGuid = instanceGuidResolver(context, counter)
  const owner = owningInstance(context.graph, layer)
  const replaced = replacedComponentLayerId(context.graph, layer)
  if (!owner || !replaced) return null
  const prefix =
    owner.id === instance.id
      ? []
      : instanceExportAddress(context.graph, instance, owner, resolveGuid)
  const definition = definitionSource(context.graph, replaced)
  const guid = definition ? resolveGuid(definition) : undefined
  if (!prefix || !guid) return null
  return [...prefix, guid].map(guidToString)
}

/**
 * Writes the layers an instance shows in place of its component's onto the instance's record as
 * plugin data, since a Figma instance holds only overrides of its component's layers. Each
 * replacement's records are written as its own layers' are, with the document's GUIDs, styles,
 * variables, and image names, and name blobs of the file they are saved in. Figma shows the
 * component's layer.
 */
export function applyReplacedLayersPluginData(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  counter: { value: number }
): void {
  if (node.type !== 'INSTANCE') return
  const layers = isCodecReady() ? replacedLayers(context, node) : []
  const stored: StoredReplacedLayer[] = []
  for (const layer of layers) {
    const path = replacedLayerPath(context, node, layer, counter)
    if (!path) continue
    const records = context.sceneNodeToKiwi(layer, { sessionID: 0, localID: 0 }, 0, counter, {
      ...context,
      writeChildren: true,
      slotContentRecords: undefined
    })
    // Images go into the file under Figma's names, as the file's own records name them.
    nameImagesForFigma(records, context.graph.images)
    const bytes = getCompiledSchema().encodeMessage({ type: 'NODE_CHANGES', nodeChanges: records })
    stored.push({ path, records: fromUint8Array(bytes) })
  }
  node.pluginData = withPluginData(
    node.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.replacedLayers,
    stored.length > 0 ? stored : undefined
  )
}
