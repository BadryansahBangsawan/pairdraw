import { isEqual } from 'es-toolkit/predicate'

import type { LayoutDirection, SceneGraph, SceneNode, TextDirection } from '@pairdraw/scene-graph'
import {
  getFillOkHCL,
  getStrokeOkHCL,
  setNodeFillOkHCL,
  setNodeStrokeOkHCL,
  type OkHCLColor,
  type OkHCLPayload
} from '@pairdraw/scene-graph/color'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'

import { assertNodeEditable } from '#core/editor/capabilities'
import { openTypeFeaturesPatch } from '#core/figma-api/accessors/text/opentype'
import { assertTextRange } from '#core/figma-api/text/style'
import { styleRunsWithPatch } from '#core/text/character-style'

import { nodeOf, type NodeRef } from './behaviours'

const DIRECTIONS = ['AUTO', 'LTR', 'RTL'] as const

/** Writes a layer's fields as a script edit does: an instance's layer claims what changed. */
function editNode(graph: SceneGraph, node: SceneNode, changes: Partial<SceneNode>): void {
  assertNodeEditable(graph, node.id)
  const changed = Object.keys(changes).filter(
    (key) => !isEqual(Reflect.get(changes, key), Reflect.get(node, key))
  )
  graph.updateNode(node.id, changes)
  recordInstanceOverride(graph, node.id, changed)
}

function direction(value: string): LayoutDirection & TextDirection {
  if (!(DIRECTIONS as readonly string[]).includes(value))
    throw new Error(`Unknown direction ${value}; use ${DIRECTIONS.join(', ')}`)
  return value as LayoutDirection & TextDirection
}

export function readFillOkHCL(graph: SceneGraph, ref: NodeRef, index: number): OkHCLPayload | null {
  return getFillOkHCL(nodeOf(graph, ref), index)
}

export function writeFillOkHCL(
  graph: SceneGraph,
  ref: NodeRef,
  color: OkHCLColor,
  index: number
): void {
  const node = nodeOf(graph, ref)
  editNode(graph, node, setNodeFillOkHCL(node, index, color, graph.documentColorSpace))
}

export function readStrokeOkHCL(
  graph: SceneGraph,
  ref: NodeRef,
  index: number
): OkHCLPayload | null {
  return getStrokeOkHCL(nodeOf(graph, ref), index)
}

export function writeStrokeOkHCL(
  graph: SceneGraph,
  ref: NodeRef,
  color: OkHCLColor,
  index: number
): void {
  const node = nodeOf(graph, ref)
  editNode(graph, node, setNodeStrokeOkHCL(node, index, color, graph.documentColorSpace))
}

/** A frame's auto layout direction; a layer saved without one reads `AUTO`. */
export function readLayoutDirection(graph: SceneGraph, ref: NodeRef): LayoutDirection {
  const node = nodeOf(graph, ref)
  return Object.hasOwn(node, 'layoutDirection') ? node.layoutDirection : 'AUTO'
}

export function writeLayoutDirection(graph: SceneGraph, ref: NodeRef, value: string): void {
  editNode(graph, nodeOf(graph, ref), { layoutDirection: direction(value) })
}

export function readTextDirection(graph: SceneGraph, ref: NodeRef): TextDirection {
  return nodeOf(graph, ref).textDirection
}

export function writeTextDirection(graph: SceneGraph, ref: NodeRef, value: string): void {
  editNode(graph, nodeOf(graph, ref), { textDirection: direction(value) })
}

/**
 * Merges OpenType features into a text's own: the given tags replace their entries, the rest
 * stay, as the panel's feature switches do. Figma's plugin API only reads a node's features;
 * this is the write path the tools and the panel share.
 */
export function writeFontFeatures(
  graph: SceneGraph,
  ref: NodeRef,
  features: Record<string, boolean>
): void {
  const node = nodeOf(graph, ref)
  const merged = new Map(node.fontFeatures.map((feature) => [feature.tag, feature.enabled]))
  for (const [tag, enabled] of Object.entries(features)) merged.set(tag.toUpperCase(), enabled)
  editNode(graph, node, {
    fontFeatures: [...merged].map(([tag, enabled]) => ({ tag, enabled }))
  })
}

/**
 * Merges OpenType features into a text range's own, keeping the features its characters already
 * had. Figma's plugin API has no range feature setter, so this lives on `pairdraw`.
 */
export function writeRangeFontFeatures(
  graph: SceneGraph,
  ref: NodeRef,
  start: number,
  end: number,
  features: Record<string, boolean>
): void {
  const node = nodeOf(graph, ref)
  assertTextRange('setRangeFontFeatures', node, start, end)
  const patch = openTypeFeaturesPatch('setRangeFontFeatures', node, start, features)
  editNode(graph, node, { styleRuns: styleRunsWithPatch(node, start, end, patch) })
}
