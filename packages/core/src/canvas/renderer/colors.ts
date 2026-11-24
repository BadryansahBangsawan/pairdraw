import type { CanvasKit, ColorSpace, ColorType, ImageInfo } from 'canvaskit-wasm'

import type { ColorProfile, Fill, SceneGraph, SceneNode, Stroke } from '@pairdraw/scene-graph'
import {
  colorToProfileCSS,
  normalizeColor,
  resolveRGBAForPreview,
  toExtendedSRGB,
  type RenderColorSpace,
  type ResolvedRenderColor
} from '@pairdraw/scene-graph/color'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { paintColorApplied } from '@pairdraw/scene-graph/variables'

/** Skia's color space for a document's. */
export function skColorSpace(ck: CanvasKit, space: ColorProfile): ColorSpace {
  return space === 'display-p3' ? ck.ColorSpace.DISPLAY_P3 : ck.ColorSpace.SRGB
}

/**
 * A premultiplied surface `width` by `height` in `profile`, as a document is drawn on: its colors
 * and blend modes work in its own profile there, as on the screen and in Figma's export.
 */
export function documentImageInfo(
  ck: CanvasKit,
  profile: ColorProfile,
  width: number,
  height: number,
  colorType: ColorType = ck.ColorType.RGBA_8888
): ImageInfo {
  return {
    width,
    height,
    colorType,
    alphaType: ck.AlphaType.Premul,
    colorSpace: skColorSpace(ck, profile)
  }
}

/**
 * A stored color, such as a paint's or a gradient stop's, as Skia is given it: its components, in
 * the document's profile, as extended sRGB, which Skia converts into the document's space of the
 * surfaces it draws on. The stored color is what draws, as in Figma; an OkHCL value kept for
 * editing only describes it.
 */
export function drawnColor(color: Color, graph: SceneGraph): Color {
  return toExtendedSRGB(normalizeColor(color), graph.documentColorSpace)
}

/**
 * The color a paint draws: the color it stores, or before a write or refresh records one, the
 * variable color a binding resolves to for the layer. OkHCL data kept from before the paint was
 * bound no longer describes it.
 */
function storedColor(
  node: SceneNode,
  list: 'fills' | 'strokes',
  index: number,
  graph: SceneGraph,
  fallback: Color
): Color {
  const field = `${list}/${index}/color`
  const variableId = node.boundVariables[field]
  if (variableId && !paintColorApplied(node, field)) {
    const resolved = graph.resolveColorVariableForNode(node.id, variableId)
    if (resolved) return resolved
  }
  return normalizeColor(fallback)
}

function colorInfo(
  color: Color,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor {
  const preview = resolveRGBAForPreview(color, {
    documentColorSpace: graph.documentColorSpace,
    colorSpace: presentation
  })
  return {
    ...preview,
    color: drawnColor(color, graph),
    cssColor: colorToProfileCSS(color, graph.documentColorSpace, presentation)
  }
}

export function resolveFillColorInfo(
  fill: Fill,
  fillIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor {
  return colorInfo(storedColor(node, 'fills', fillIndex, graph, fill.color), graph, presentation)
}

export function resolveFillColor(
  fill: Fill,
  fillIndex: number,
  node: SceneNode,
  graph: SceneGraph
): Color {
  return drawnColor(storedColor(node, 'fills', fillIndex, graph, fill.color), graph)
}

export function resolveStrokeColorInfo(
  stroke: Stroke,
  strokeIndex: number,
  node: SceneNode,
  graph: SceneGraph,
  presentation: RenderColorSpace
): ResolvedRenderColor {
  return colorInfo(
    storedColor(node, 'strokes', strokeIndex, graph, stroke.color),
    graph,
    presentation
  )
}

export function resolveStrokeColor(
  stroke: Stroke,
  strokeIndex: number,
  node: SceneNode,
  graph: SceneGraph
): Color {
  return drawnColor(storedColor(node, 'strokes', strokeIndex, graph, stroke.color), graph)
}
