import type { Canvas } from 'canvaskit-wasm'

import type { SnapGuide } from '@pairdraw/scene-graph/snap'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { SNAP_COLOR, SPACING_GUIDE_CAP } from '#core/constants'

import { drawPill } from './measurement'

/** Labels show a gap to two decimals, as the properties panel shows sizes. */
const GAP_LABEL_PRECISION = 100

/** The size an equal-spacing indicator labels its gap with. */
export function spacingGuideLabel(guide: SnapGuide): string {
  const gap = Math.abs(guide.to - guide.from)
  return String(Math.round(gap * GAP_LABEL_PRECISION) / GAP_LABEL_PRECISION)
}

/** A guide's line on screen, from its `from` end to its `to` end. */
export function guideScreenLine(r: SkiaRenderer, guide: SnapGuide) {
  const vertical = guide.axis === 'x'
  const at = guide.position * r.zoom + (vertical ? r.panX : r.panY)
  const pan = vertical ? r.panY : r.panX
  const from = guide.from * r.zoom + pan
  const to = guide.to * r.zoom + pan
  return vertical ? { x1: at, y1: from, x2: at, y2: to } : { x1: from, y1: at, x2: to, y2: at }
}

/**
 * One equal-spacing indicator, as Figma draws it while a move lands on equal gaps: a line across the
 * gap in the snap colour, a tick at each end, and the gap's size on a plate in the middle.
 */
export function drawSpacingGuide(r: SkiaRenderer, canvas: Canvas, guide: SnapGuide): void {
  const paint = r.snapPaint
  const cap = SPACING_GUIDE_CAP
  const label = spacingGuideLabel(guide)
  const { x1, y1, x2, y2 } = guideScreenLine(r, guide)
  canvas.drawLine(x1, y1, x2, y2, paint)
  if (guide.axis === 'y') {
    canvas.drawLine(x1, y1 - cap, x1, y1 + cap, paint)
    canvas.drawLine(x2, y2 - cap, x2, y2 + cap, paint)
  } else {
    canvas.drawLine(x1 - cap, y1, x1 + cap, y1, paint)
    canvas.drawLine(x2 - cap, y2, x2 + cap, y2, paint)
  }
  drawPill(r, canvas, label, (x1 + x2) / 2, (y1 + y2) / 2, SNAP_COLOR)
}
