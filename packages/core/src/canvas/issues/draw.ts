import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { inNodeSpace, withScreenStroke } from '#core/canvas/overlays/outline'
import type { SkiaRenderer } from '#core/canvas/renderer'
import {
  ISSUE_ERROR_COLOR,
  ISSUE_HIGHLIGHT_FILL_ALPHA,
  ISSUE_HIGHLIGHT_STROKE_WIDTH,
  ISSUE_INFO_COLOR,
  ISSUE_WARNING_COLOR
} from '#core/constants'
import { createSceneGeometry, type RotationPreview } from '#core/geometry'

import type { DesignIssueHighlight, DesignIssueSeverity } from './types'

const TARGET_DASH = 3

function issueSeverityColor(severity: DesignIssueSeverity): Color {
  if (severity === 'error') return ISSUE_ERROR_COLOR
  if (severity === 'warning') return ISSUE_WARNING_COLOR
  return ISSUE_INFO_COLOR
}

function color4f(r: SkiaRenderer, color: Color, alpha = color.a) {
  return r.ck.Color4f(color.r, color.g, color.b, alpha)
}

export function drawIssueHighlight(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  highlight: DesignIssueHighlight | null | undefined,
  preview?: RotationPreview | null
): void {
  const node = highlight ? graph.getNode(highlight.nodeId) : undefined
  if (!highlight || !node) return
  const color = issueSeverityColor(highlight.severity)

  inNodeSpace(r, canvas, createSceneGeometry(graph, preview), node, () => {
    r.auxFill.setColor(color4f(r, color, ISSUE_HIGHLIGHT_FILL_ALPHA))
    canvas.drawRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.auxFill)
    const stroke = { color: color4f(r, color), width: ISSUE_HIGHLIGHT_STROKE_WIDTH }
    withScreenStroke(r, stroke, (paint) => r.strokeNodeShape(canvas, node, paint))

    const minSize = highlight.minSize
    if (minSize && (node.width < minSize.width || node.height < minSize.height)) {
      const width = Math.max(node.width, minSize.width)
      const height = Math.max(node.height, minSize.height)
      const left = (node.width - width) / 2
      const top = (node.height - height) / 2
      const target = { color: color4f(r, color), dash: [TARGET_DASH, TARGET_DASH] as const }
      withScreenStroke(r, target, (paint) =>
        canvas.drawRect(r.ck.LTRBRect(left, top, left + width, top + height), paint)
      )
    }
  })
}
