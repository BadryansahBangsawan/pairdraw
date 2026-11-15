import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import {
  drawNodeHighlightRect,
  ensureFlashPaint,
  nodeScreenBox,
  type ScreenBox
} from '#core/canvas/highlight-rect'
import { entranceFrame, shimmerPosition, type EntranceFrame } from '#core/canvas/overlays/ai/motion'
import type { SkiaRenderer } from '#core/canvas/renderer'
import {
  AI_AGENT_COLOR,
  AI_DONE_COLOR,
  AI_DONE_DURATION_MS,
  AI_ENTER_DURATION_MS,
  AI_SHIMMER_BAND
} from '#core/constants'

const AI_LINE_WIDTH = 1.5
const WORK_AREA_OUTLINE_ALPHA = 0.55
const WORK_AREA_FILL_ALPHA = 0.04
const SHIMMER_ALPHA = 0.16

function agentColor(r: SkiaRenderer, alpha: number) {
  return r.ck.Color4f(AI_AGENT_COLOR.r, AI_AGENT_COLOR.g, AI_AGENT_COLOR.b, alpha)
}

/** Runs `draw` in the box's frame on screen, turned with its layer, and with its rect. */
function inScreenBox(
  r: SkiaRenderer,
  canvas: Canvas,
  box: ScreenBox,
  draw: (rect: Float32Array) => void
): void {
  const { cx, cy, hw, hh } = box
  canvas.save()
  if (box.rotation !== 0) canvas.rotate(box.rotation, cx, cy)
  draw(r.ck.LTRBRect(cx - hw, cy - hh, cx + hw, cy + hh))
  canvas.restore()
}

/** A layer an agent added: a violet wash that fades while its outline traces round it. */
function drawEntrance(r: SkiaRenderer, canvas: Canvas, box: ScreenBox, frame: EntranceFrame) {
  inScreenBox(r, canvas, box, (rect) => {
    if (frame.wash > 0) {
      r.auxFill.setColor(agentColor(r, frame.wash))
      canvas.drawRect(rect, r.auxFill)
    }
    const perimeter = 4 * (box.hw + box.hh)
    const drawn = perimeter * frame.trace
    if (frame.outline <= 0 || drawn < 1) return
    const paint = ensureFlashPaint(r)
    paint.setColor(agentColor(r, frame.outline))
    paint.setStrokeWidth(AI_LINE_WIDTH)
    // A rect's outline starts at its top-left corner and runs clockwise, so one dash traces it.
    const dash = frame.trace < 1 ? r.ck.PathEffect.MakeDash([drawn, perimeter], 0) : null
    paint.setPathEffect(dash)
    canvas.drawRect(rect, paint)
    paint.setPathEffect(null)
    dash?.delete()
  })
}

/** An area an agent is working in: a light sweeping across it inside a violet outline. */
function drawWorkArea(r: SkiaRenderer, canvas: Canvas, box: ScreenBox, now: number) {
  inScreenBox(r, canvas, box, (rect) => {
    const left = box.cx - box.hw
    const top = box.cy - box.hh
    // The light runs along the diagonal, measured from the top-left corner.
    const span = (2 * box.hw + 2 * box.hh) / Math.SQRT2
    const at = shimmerPosition(now, span) / Math.SQRT2
    const half = AI_SHIMMER_BAND / 2 / Math.SQRT2
    const shader = r.ck.Shader.MakeLinearGradient(
      [left + at - half, top + at - half],
      [left + at + half, top + at + half],
      [agentColor(r, 0), agentColor(r, SHIMMER_ALPHA), agentColor(r, 0)],
      [0, 0.5, 1],
      r.ck.TileMode.Clamp
    )
    r.auxFill.setColor(agentColor(r, WORK_AREA_FILL_ALPHA))
    canvas.drawRect(rect, r.auxFill)
    r.auxFill.setColor(agentColor(r, 1))
    r.auxFill.setShader(shader)
    canvas.drawRect(rect, r.auxFill)
    r.auxFill.setShader(null)
    shader.delete()

    const paint = ensureFlashPaint(r)
    paint.setColor(agentColor(r, WORK_AREA_OUTLINE_ALPHA))
    paint.setStrokeWidth(AI_LINE_WIDTH)
    canvas.drawRect(rect, paint)
  })
}

export function drawAIOverlays(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph): void {
  const now = performance.now()

  for (const nodeId of r._aiActiveNodes) {
    const box = nodeScreenBox(r, graph, nodeId)
    if (box) drawWorkArea(r, canvas, box, now)
  }

  for (let i = r._aiEntrances.length - 1; i >= 0; i--) {
    const entrance = r._aiEntrances[i]
    const elapsed = now - entrance.startTime
    // Still waiting for its turn: the layer shows as it is until then.
    if (elapsed < 0) continue
    const box = elapsed > AI_ENTER_DURATION_MS ? null : nodeScreenBox(r, graph, entrance.nodeId)
    if (!box) {
      r._aiEntrances.splice(i, 1)
      continue
    }
    drawEntrance(r, canvas, box, entranceFrame(elapsed / AI_ENTER_DURATION_MS))
  }

  for (let i = r._aiDoneFlashes.length - 1; i >= 0; i--) {
    const flash = r._aiDoneFlashes[i]
    const elapsed = now - flash.startTime
    if (elapsed > AI_DONE_DURATION_MS) {
      r._aiDoneFlashes.splice(i, 1)
      continue
    }
    const t = elapsed / AI_DONE_DURATION_MS
    const opacity = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7
    drawNodeHighlightRect(r, canvas, graph, flash.nodeId, AI_DONE_COLOR, opacity)
  }
}
