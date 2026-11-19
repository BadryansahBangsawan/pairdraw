import type { Fill, SceneGraph, SceneNode, Stroke } from '@pairdraw/scene-graph'
import {
  resolveNodeFillColor,
  resolveNodeStrokeColor,
  resolveRGBAForPreview,
  type RenderColorSpace,
  type ResolvedRenderColor,
  normalizeColor,
  getFillOkHCL,
  getStrokeOkHCL
} from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { paintColorApplied } from '@pairdraw/scene-graph/variables'

/**
 * A bound paint draws the color it stores once the graph has applied or recorded one for it, as
 * Figma draws its cache; OkHCL data kept from before it was bound no longer describes it. A
 * binding with no applied color, as a layer just imported or built with its bindings has, draws
 * its variable's color for the layer until a write or refresh records one.
 */
function boundDrawnColor(
  node: SceneNode,
  list: 'fills' | 'strokes',
  index: number,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor | undefined {
  const field = `${list}/${index}/color`
  const variableId = node.boundVariables[field]
  if (!variableId) return undefined
  if (paintColorApplied(node, field)) return undefined
  const resolved = graph.resolveColorVariableForNode(node.id, variableId)
  if (!resolved) return undefined
  return {
    ...resolveRGBAForPreview(resolved, {
      documentColorSpace: graph.documentColorSpace,
      colorSpace: presentation
    }),
    cssColor: ''
  }
}

function isBound(node: SceneNode, list: 'fills' | 'strokes', index: number): boolean {
  return `${list}/${index}/color` in node.boundVariables
}

export function resolveFillColorInfo(
  fill: Fill,
  fillIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor {
  const options = { documentColorSpace: graph.documentColorSpace, colorSpace: presentation }
  const drawn = boundDrawnColor(node, 'fills', fillIndex, graph, presentation)
  if (drawn) return drawn
  if (isBound(node, 'fills', fillIndex)) return resolveRGBAForPreview(fill.color, options)
  return resolveNodeFillColor(fill, fillIndex, node, options)
}

export function resolveFillColor(
  fill: Fill,
  fillIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): Color {
  const drawn = boundDrawnColor(node, 'fills', fillIndex, graph, presentation)
  if (drawn) return drawn.color
  if (isBound(node, 'fills', fillIndex) || !getFillOkHCL(node, fillIndex))
    return normalizeColor(fill.color)
  return resolveFillColorInfo(fill, fillIndex, node, graph, presentation).color
}

export function resolveStrokeColorInfo(
  stroke: Stroke,
  strokeIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor {
  const options = { documentColorSpace: graph.documentColorSpace, colorSpace: presentation }
  const drawn = boundDrawnColor(node, 'strokes', strokeIndex, graph, presentation)
  if (drawn) return drawn
  if (isBound(node, 'strokes', strokeIndex)) return resolveRGBAForPreview(stroke.color, options)
  return resolveNodeStrokeColor(stroke, strokeIndex, node, options)
}

export function resolveStrokeColor(
  stroke: Stroke,
  strokeIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): Color {
  const drawn = boundDrawnColor(node, 'strokes', strokeIndex, graph, presentation)
  if (drawn) return drawn.color
  if (isBound(node, 'strokes', strokeIndex) || !getStrokeOkHCL(node, strokeIndex))
    return normalizeColor(stroke.color)
  return resolveStrokeColorInfo(stroke, strokeIndex, node, graph, presentation).color
}
