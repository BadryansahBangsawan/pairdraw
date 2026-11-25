import type { ViewportTransform } from '@pairdraw/core/geometry'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Rect } from '@pairdraw/scene-graph/primitives'
import {
  isShaderPresetPaint,
  readShaderPaints,
  shaderOfPaint,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

/** A shader preset a page draws, and the layers that paint it. */
export interface PageShader {
  preset: ShaderPreset
  nodeIds: Set<string>
  /** Where the layers that paint it are, on the page. */
  bounds: Rect[]
}

/** Whether `node` and every layer above it are visible, so the canvas draws it. */
function isShown(node: SceneNode, graph: SceneGraph): boolean {
  return graph.closest(node.id, (current) => !current.visible) === undefined
}

/**
 * Each image a preset shader on `pageId` shows, with its preset and the layers painting it, as
 * far as a player may draw it: a hidden layer, a hidden ancestor, a hidden paint, or code the
 * user wrote (which the canvas compiles itself) is left out.
 */
export function shadersOnPage(graph: SceneGraph, pageId: string): Map<string, PageShader> {
  const found = new Map<string, PageShader>()
  for (const node of graph.getAllNodes()) {
    if (readShaderPaints(node).length === 0 || !graph.isDescendant(node.id, pageId)) continue
    if (!isShown(node, graph)) continue
    for (const paint of [...node.fills, ...node.strokes]) {
      if (!paint.visible) continue
      const shader = shaderOfPaint(node, paint)
      if (!shader || !isShaderPresetPaint(shader)) continue
      const entry = found.get(shader.image) ?? {
        preset: shader.preset,
        nodeIds: new Set<string>(),
        bounds: []
      }
      entry.nodeIds.add(node.id)
      entry.bounds.push(graph.getAbsoluteBounds(node.id))
      found.set(shader.image, entry)
    }
  }
  return found
}

/** Whether any part of `bounds` is inside the view, at its pan and zoom. */
export function onScreen(
  bounds: readonly Rect[],
  view: ViewportTransform,
  viewport: { width: number; height: number }
): boolean {
  return bounds.some(
    (rect) =>
      rect.x * view.zoom + view.panX < viewport.width &&
      (rect.x + rect.width) * view.zoom + view.panX > 0 &&
      rect.y * view.zoom + view.panY < viewport.height &&
      (rect.y + rect.height) * view.zoom + view.panY > 0
  )
}
