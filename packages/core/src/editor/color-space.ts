import type { DocumentColorSpace, Fill, SceneNode } from '@pairdraw/scene-graph'
import { okhclToRGBA, rgbaToOkHCL } from '@pairdraw/scene-graph/color'
import { copyEffects, copyFill, copyStyleRuns, copyStroke } from '@pairdraw/scene-graph/copy'

import type { EditorContext } from './types'

export type DocumentColorProfileMode = 'assign' | 'convert'

function remapColor(
  color: SceneNode['fills'][number]['color'],
  source: DocumentColorSpace,
  target: DocumentColorSpace
) {
  if (source === target) return color
  return okhclToRGBA(rgbaToOkHCL(color, source), target)
}

/** A paint's colours in the target space: the base colour, a gradient's stops, and mesh points. */
function remapPaint<T extends Fill>(
  next: T,
  fill: T,
  source: DocumentColorSpace,
  target: DocumentColorSpace
): T {
  const resolved = remapColor(fill.color, source, target)
  next.color = resolved
  if (fill.type === 'SOLID') next.opacity = resolved.a
  if (fill.gradientStops)
    next.gradientStops = fill.gradientStops.map((stop) => ({
      ...stop,
      color: remapColor(stop.color, source, target)
    }))
  if (fill.meshPoints)
    next.meshPoints = fill.meshPoints.map((point) => ({
      ...point,
      color: remapColor(point.color, source, target)
    }))
  return next
}

function remapFill(fill: Fill, source: DocumentColorSpace, target: DocumentColorSpace): Fill {
  return remapPaint(copyFill(fill), fill, source, target)
}

function remapNodeColors(
  node: SceneNode,
  source: DocumentColorSpace,
  target: DocumentColorSpace,
  mode: DocumentColorProfileMode
): Partial<SceneNode> | null {
  if (mode === 'assign') return null

  const fills = node.fills.map((fill) => remapFill(fill, source, target))

  const strokes = node.strokes.map((stroke) =>
    remapPaint(copyStroke(stroke), stroke, source, target)
  )

  const effects = copyEffects(node.effects).map((effect) =>
    effect.type === 'SHADER'
      ? effect
      : { ...effect, color: remapColor(effect.color, source, target) }
  )

  const styleRuns = copyStyleRuns(node.styleRuns).map((run) => ({
    ...run,
    style: {
      ...run.style,
      fills: run.style.fills?.map((fill) => remapFill(fill, source, target))
    }
  }))

  return { fills, strokes, effects, styleRuns }
}

export function createColorSpaceActions(ctx: EditorContext) {
  function setDocumentColorSpace(
    colorSpace: DocumentColorSpace,
    mode: DocumentColorProfileMode = 'assign'
  ) {
    if (ctx.graph.documentColorSpace === colorSpace) return

    if (mode === 'convert') {
      const source = ctx.graph.documentColorSpace
      for (const node of ctx.graph.getAllNodes()) {
        const changes = remapNodeColors(node, source, colorSpace, mode)
        if (changes) ctx.graph.updateNode(node.id, changes)
      }
    }

    ctx.graph.documentColorSpace = colorSpace
    ctx.emitEditorEvent('document:color-space-changed', colorSpace)
    ctx.requestRender()
  }

  return {
    setDocumentColorSpace
  }
}
