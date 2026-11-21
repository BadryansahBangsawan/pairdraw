import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { styleRunReferences } from '@pairdraw/scene-graph/text'
import { captureAppliedBoundPaints, type AppliedBoundPaints } from '@pairdraw/scene-graph/variables'

import { resolvedClipboardBindings } from './detach'
import { clipboardPlacement, type ClipboardPlacement } from './placement'
import { captureClipboardVariables, type ClipboardVariables } from './variables'

export type ClipboardNodeTree = SceneNode & { children?: ClipboardNodeTree[] }

export interface ClipboardSnapshot {
  sourceRootId: string
  componentDependencies: ClipboardNodeTree[]
  styleDefinitions: SceneNode[]
  variableDependencies: ClipboardVariables
  nodes: ClipboardNodeTree[]
  /** Where the copied layers sat on the canvas when they were copied. */
  placement: ClipboardPlacement
  images: Map<string, Uint8Array>
  /** The colors the copied layers' bound paints were last given, so a paste counts from those. */
  appliedBoundPaints: AppliedBoundPaints
  /**
   * By copied layer id, the values its variable bindings showed where it was copied, for the
   * fields whose stored value differs; a paste as is in another document writes them.
   */
  resolvedBindings?: Map<string, Partial<SceneNode>>
  /** Written by Copy properties: Paste skips it and Paste properties reads it, as in Figma. */
  properties?: boolean
}

function referencedStyleIds(nodes: SceneNode[]): Set<string> {
  const ids = new Set<string>()
  for (const node of nodes) {
    for (const id of [
      node.fillStyleId,
      node.strokeStyleId,
      node.textStyleId,
      node.effectStyleId,
      node.gridStyleId,
      ...styleRunReferences(node.styleRuns).styles
    ]) {
      if (id) ids.add(id)
    }
  }
  return ids
}

export function captureClipboardSnapshot(
  graph: SceneGraph,
  selectedNodes: SceneNode[]
): ClipboardSnapshot {
  const selectedIds = new Set(selectedNodes.map((node) => node.id))
  const roots = selectedNodes.filter((node) => !node.parentId || !selectedIds.has(node.parentId))
  const images = new Map<string, Uint8Array>()
  const capturedNodes: SceneNode[] = []
  const resolvedBindings = new Map<string, Partial<SceneNode>>()
  function capture(node: SceneNode): ClipboardNodeTree {
    capturedNodes.push(node)
    const resolved = resolvedClipboardBindings(graph, node)
    if (resolved) resolvedBindings.set(node.id, resolved)
    for (const paint of node.fills) {
      if (!paint.imageHash) continue
      const bytes = graph.images.get(paint.imageHash)
      if (bytes) images.set(paint.imageHash, bytes.slice())
    }
    return { ...structuredClone(node), children: graph.getChildren(node.id).map(capture) }
  }
  const nodes = roots.map(capture)
  const componentDependencies = new Map<string, ClipboardNodeTree>()
  function captureComponent(id: string) {
    if (componentDependencies.has(id) || selectedIds.has(id)) return
    const component = graph.getNode(id)
    if (!component || (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET')) return
    // A variant travels as its set: the variant properties, the values each variant sets, and the
    // properties defined on the set live there, so a copy of one variant without it cannot switch.
    const parent = component.parentId ? graph.getNode(component.parentId) : undefined
    const carried = parent?.type === 'COMPONENT_SET' ? parent : component
    if (componentDependencies.has(carried.id) || selectedIds.has(carried.id)) return
    const tree = capture(carried)
    componentDependencies.set(carried.id, tree)
    visitReferences(tree)
  }
  function visitReferences(node: ClipboardNodeTree) {
    if (node.componentId) captureComponent(node.componentId)
    for (const child of node.children ?? []) visitReferences(child)
  }
  for (const node of nodes) visitReferences(node)
  const styleIds = referencedStyleIds(capturedNodes)
  const styleDefinitions: SceneNode[] = []
  for (const node of graph.getAllNodes()) {
    if (node.source.id && styleIds.has(node.source.id)) styleDefinitions.push(structuredClone(node))
  }
  return {
    sourceRootId: graph.rootId,
    componentDependencies: [...componentDependencies.values()],
    styleDefinitions,
    variableDependencies: captureClipboardVariables(graph, capturedNodes),
    nodes,
    placement: clipboardPlacement(graph, roots),
    images,
    appliedBoundPaints: captureAppliedBoundPaints(
      graph,
      capturedNodes.map((node) => node.id)
    ),
    resolvedBindings
  }
}
