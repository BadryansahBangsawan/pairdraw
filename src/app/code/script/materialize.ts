/**
 * Draws a script's layers under its node. A run replaces the previous output wholesale, so a
 * script and its output are never out of step, and the graph calls are direct: a run is the
 * script node's render, not a document edit of its own, so it adds no undo step.
 */
import { newLayerDefaults } from '@open-pencil/core'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { parseColor } from '@open-pencil/scene-graph/color'

import { countScriptNodes, type ScriptNodeSpec } from '@/app/code/script/sandbox/spec'

const FILL_OPACITY = 1
const PLACEHOLDER_WIDTH = 240
const PLACEHOLDER_HEIGHT = 80
const ERROR_COLOR = '#d93036'
const TEXT_COLOR = '#1e1e1e'

function paint(hex: string, weight?: number): SceneNode['fills'] {
  const color = parseColor(hex)
  return weight === undefined
    ? [{ type: 'SOLID', color, opacity: FILL_OPACITY, visible: true }]
    : []
}

function stroke(hex: string, weight: number): SceneNode['strokes'] {
  return [
    { type: 'SOLID', color: parseColor(hex), opacity: 1, visible: true, weight, align: 'CENTER' }
  ]
}

/** The text fields a TEXT spec asks for; anything left out keeps the node's default. */
function textOverrides(spec: ScriptNodeSpec): Partial<SceneNode> {
  const overrides: Partial<SceneNode> = { text: spec.text ?? '', textAutoResize: 'HEIGHT' }
  if (spec.fontSize !== undefined) overrides.fontSize = spec.fontSize
  if (spec.fontWeight !== undefined) overrides.fontWeight = spec.fontWeight
  if (spec.align) overrides.textAlignHorizontal = spec.align
  if (!spec.fill) overrides.fills = paint(TEXT_COLOR)
  return overrides
}

/** Auto-layout on a spec's frame or shape, sized to its children as the script drew them. */
function layoutOverrides(spec: ScriptNodeSpec): Partial<SceneNode> {
  const padding = spec.padding ?? 0
  return {
    layoutMode: spec.layout,
    itemSpacing: spec.gap ?? 0,
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding,
    paddingBottom: padding,
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG'
  }
}

/** One spec as a layer, before its children. */
function createLayer(graph: SceneGraph, spec: ScriptNodeSpec, parentId: string, index: number) {
  const type = spec.type === 'ROUNDED_RECTANGLE' ? 'RECTANGLE' : spec.type
  const overrides: Partial<SceneNode> = {
    ...newLayerDefaults(type),
    x: spec.x ?? 0,
    y: spec.y ?? 0,
    width: spec.width ?? 100,
    height: spec.height ?? 100,
    name: spec.name ?? type.charAt(0) + type.slice(1).toLowerCase()
  }
  if (type === 'TEXT') Object.assign(overrides, textOverrides(spec))
  if (spec.layout) Object.assign(overrides, layoutOverrides(spec))
  if (spec.fill) overrides.fills = paint(spec.fill)
  if (spec.stroke && spec.strokeWeight !== undefined) {
    overrides.strokes = stroke(spec.stroke, spec.strokeWeight)
  }
  if (spec.opacity !== undefined) overrides.opacity = spec.opacity
  if (spec.radius !== undefined) overrides.cornerRadius = spec.radius
  const node = graph.createNode(type, parentId, overrides)
  // `createNode` appends; a run draws its layers in the order the script built them.
  graph.insertChildAt(node.id, parentId, index)
  return node
}

function createSubtree(
  graph: SceneGraph,
  spec: ScriptNodeSpec,
  parentId: string,
  index: number
): void {
  const node = createLayer(graph, spec, parentId, index)
  for (const [childIndex, child] of (spec.children ?? []).entries()) {
    createSubtree(graph, child, node.id, childIndex)
  }
}

/** A failed run's error, drawn on the canvas where the script's layers would be. */
export function materializeScriptError(
  graph: SceneGraph,
  scriptNodeId: string,
  message: string
): string {
  const parent = graph.getNode(scriptNodeId)
  if (!parent) throw new Error('The script node is gone.')
  const frame = graph.createNode('FRAME', scriptNodeId, {
    ...newLayerDefaults('FRAME'),
    name: 'Script error',
    x: 0,
    y: 0,
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_HEIGHT
  })
  graph.createNode('TEXT', frame.id, {
    name: 'Error',
    x: 12,
    y: 12,
    width: PLACEHOLDER_WIDTH - 24,
    height: PLACEHOLDER_HEIGHT - 24,
    text: message,
    fontSize: 12,
    fills: paint(ERROR_COLOR),
    textAutoResize: 'HEIGHT'
  })
  return frame.id
}

export interface MaterializeScriptResult {
  /** The roots drawn, in order. */
  rootIds: string[]
  /** How many layers the run drew. */
  nodeCount: number
}

/**
 * Replaces the script node's output with `roots`. The caller has already checked them against the
 * sandbox limits; this only draws. Returns the roots kept, so a caller can select them.
 */
export function materializeScriptOutput(
  graph: SceneGraph,
  scriptNodeId: string,
  roots: readonly ScriptNodeSpec[],
  pageId: string
): MaterializeScriptResult {
  const node = graph.getNode(scriptNodeId)
  if (!node) throw new Error('The script node is gone.')
  for (const childId of node.childIds) graph.deleteNode(childId)
  const rootIds: string[] = []
  for (const [index, root] of roots.entries()) {
    createSubtree(graph, root, scriptNodeId, index)
    const created = graph.getNode(scriptNodeId)?.childIds.at(index)
    if (created) rootIds.push(created)
  }
  const nodeCount = countScriptNodes(roots)
  computeAllLayouts(graph, pageId)
  return { rootIds, nodeCount }
}
