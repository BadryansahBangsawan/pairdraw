import type { Canvas, Paint } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import { FLASH_PADDING, FLASH_STROKE_WIDTH, FLASH_RADIUS } from '#core/constants'

import type { SkiaRenderer } from './renderer'

export function ensureFlashPaint(r: SkiaRenderer): Paint {
  if (!r._flashPaint) {
    r._flashPaint = new r.ck.Paint()
    r._flashPaint.setStyle(r.ck.PaintStyle.Stroke)
    r._flashPaint.setAntiAlias(true)
  }
  return r._flashPaint
}

/** A node's box on screen: its centre, half its size, and its rotation in degrees. */
export interface ScreenBox {
  cx: number
  cy: number
  hw: number
  hh: number
  rotation: number
}

export function nodeScreenBox(
  r: SkiaRenderer,
  graph: SceneGraph,
  nodeId: string
): ScreenBox | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  const abs = graph.getAbsolutePosition(nodeId)
  return {
    cx: (abs.x + node.width / 2) * r.zoom + r.panX,
    cy: (abs.y + node.height / 2) * r.zoom + r.panY,
    hw: (node.width / 2) * r.zoom,
    hh: (node.height / 2) * r.zoom,
    rotation: node.rotation
  }
}

export function drawNodeHighlightRect(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  nodeId: string,
  color: { r: number; g: number; b: number },
  opacity: number,
  extraPad = 0
): boolean {
  const box = nodeScreenBox(r, graph, nodeId)
  if (!box) return false
  const { cx, cy, hw, hh } = box
  const pad = FLASH_PADDING + extraPad

  const paint = ensureFlashPaint(r)
  paint.setColor(r.ck.Color4f(color.r, color.g, color.b, opacity))
  paint.setStrokeWidth(FLASH_STROKE_WIDTH)

  canvas.save()
  if (box.rotation !== 0) canvas.rotate(box.rotation, cx, cy)
  const rect = r.ck.RRectXY(
    r.ck.LTRBRect(cx - hw - pad, cy - hh - pad, cx + hw + pad, cy + hh + pad),
    FLASH_RADIUS,
    FLASH_RADIUS
  )
  canvas.drawRRect(rect, paint)
  canvas.restore()
  return true
}
