import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  generatedFrameKind,
  generatedFrameOwner,
  generatedFrameText
} from '@pairdraw/scene-graph/generated'
import { textLayerName } from '@pairdraw/scene-graph/node-defaults'

import type { EditorContext } from '#core/editor/types'

/**
 * Whether a layer's name follows the text it holds: a text layer, or a frame a shape or sticky
 * note is named by, as FigJam does.
 */
export function namedByText(node: SceneNode): boolean {
  return node.type === 'TEXT' || (generatedFrameKind(node)?.namedByText ?? false)
}

/** The layer whose name a text edit to `nodeId` decides, or null when it decides none. */
function textNamedLayer(graph: SceneGraph, nodeId: string): SceneNode | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  const frame = generatedFrameOwner(graph, node)
  if (frame) {
    if (!generatedFrameKind(frame)?.namedByText) return null
    return generatedFrameText(graph, frame)?.id === nodeId ? frame : null
  }
  return node.type === 'TEXT' ? node : null
}

/** The rename `text` gives the layer at `nodeId`, or null when the layer keeps its name. */
function textRename(
  graph: SceneGraph,
  nodeId: string,
  text: string
): { id: string; name: string } | null {
  const layer = textNamedLayer(graph, nodeId)
  if (!layer?.autoRename) return null
  const name = textLayerName(layer.type, text)
  return name === layer.name ? null : { id: layer.id, name }
}

/**
 * Typing in a text layer, or in the text a shape or sticky note is named by, renames that layer
 * while it was never renamed, as Figma does; emptied, it takes its type's name back. The caller
 * records the text edit; this records the rename beside it.
 */
export function applyTextNameEdit(
  ctx: Pick<EditorContext, 'graph' | 'undo'>,
  nodeId: string,
  text: string
): void {
  const rename = textRename(ctx.graph, nodeId, text)
  if (!rename) return
  const before = ctx.graph.getNode(rename.id)?.name
  if (before === undefined) return
  const apply = (name: string) => () => ctx.graph.updateNode(rename.id, { name })
  apply(rename.name)()
  ctx.undo.push({ label: 'Rename', forward: apply(rename.name), inverse: apply(before) })
}

/** The same rename for a text set the way the Plugin API sets it, which records no undo step. */
export function renameTextLayer(graph: SceneGraph, nodeId: string, text: string): void {
  const rename = textRename(graph, nodeId, text)
  if (rename) graph.updateNode(rename.id, { name: rename.name })
}
