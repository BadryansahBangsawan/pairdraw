import type { Editor } from '@pairdraw/core'
import type { ViewportTransform } from '@pairdraw/core/geometry'

/** How long a viewport change glides, in milliseconds. */
export const VIEWPORT_TWEEN_MS = 220

/** Where the canvas looks: its pan in screen pixels and its zoom. */
export type ViewportFrame = ViewportTransform

type ViewportEditor = Pick<Editor, 'state' | 'requestRepaint' | 'onEditorEvent'>

interface RunningTween {
  target: ViewportFrame
  frame: number
  stopListening: () => void
}

/** A glide's progress eased in and out, so it starts and lands softly. */
export function easeViewport(t: number): number {
  const p = Math.min(1, Math.max(0, t))
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * The view `t` of the way from `from` to `to`. The zoom changes by equal ratios, and while it
 * changes every point moves in a straight line from the one point both views draw at the same
 * place on the screen, so a zoom about the pointer or the center stays about it; a pan without a
 * zoom moves straight.
 */
export function interpolateViewport(
  from: ViewportFrame,
  to: ViewportFrame,
  t: number
): ViewportFrame {
  if (t <= 0) return { ...from }
  if (t >= 1) return { ...to }
  const zoom = from.zoom * (to.zoom / from.zoom) ** t
  const zoomDelta = from.zoom - to.zoom
  if (Math.abs(zoomDelta) <= from.zoom * 1e-9) {
    return { panX: lerp(from.panX, to.panX, t), panY: lerp(from.panY, to.panY, t), zoom }
  }
  // The world point both views put at the same screen point, and that screen point.
  const worldX = (to.panX - from.panX) / zoomDelta
  const worldY = (to.panY - from.panY) / zoomDelta
  const screenX = worldX * from.zoom + from.panX
  const screenY = worldY * from.zoom + from.panY
  return { panX: screenX - worldX * zoom, panY: screenY - worldY * zoom, zoom }
}

const running = new WeakMap<object, RunningTween>()
const motionPolicies = new WeakMap<object, () => boolean>()

/**
 * Sets whether this editor's viewport changes glide; the host turns them off where it turns
 * animations off. Without a policy they glide unless the system asks for reduced motion.
 */
export function setViewportMotion(editor: Pick<Editor, 'state'>, enabled: () => boolean): void {
  motionPolicies.set(editor.state, enabled)
}

function motionEnabled(editor: Pick<Editor, 'state'>): boolean {
  if (typeof requestAnimationFrame !== 'function') return false
  const policy = motionPolicies.get(editor.state)
  if (policy) return policy()
  return typeof matchMedia === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches
}

function frameOf(editor: Pick<Editor, 'state'>): ViewportFrame {
  const { panX, panY, zoom } = editor.state
  return { panX, panY, zoom }
}

function show(editor: ViewportEditor, frame: ViewportFrame): void {
  editor.state.panX = frame.panX
  editor.state.panY = frame.panY
  editor.state.zoom = frame.zoom
  editor.requestRepaint()
}

/**
 * Stops the editor's glide where it is, as a press or a wheel on the canvas takes over, or with
 * `finish` at its target, as the next viewport change starts from there.
 */
export function stopViewportTween(editor: ViewportEditor, finish = false): void {
  const tween = running.get(editor.state)
  if (!tween) return
  running.delete(editor.state)
  cancelAnimationFrame(tween.frame)
  tween.stopListening()
  if (finish) show(editor, tween.target)
}

/** Whether the editor's view is gliding now. */
export function isViewportTweening(editor: Pick<Editor, 'state'>): boolean {
  return running.has(editor.state)
}

/**
 * Runs a viewport change, such as zoom to fit, and glides the view from where it was to where the
 * change put it. The change's `viewport:changed` event carries its target at once, but the
 * editor's state walks the in-between views until the glide ends; `stopViewportTween(editor, true)`
 * lands it first where a reader needs the target. With animations off, reduced motion, or no
 * animation frames it stays instant. Leaving the page lands the glide before the page's view is
 * saved; a viewport change from elsewhere or a new document stops it where it is.
 */
export function animateViewport(editor: ViewportEditor, change: () => void): void {
  stopViewportTween(editor, true)
  const from = frameOf(editor)
  change()
  const target = frameOf(editor)
  const moved = from.panX !== target.panX || from.panY !== target.panY || from.zoom !== target.zoom
  if (!moved || !motionEnabled(editor)) return

  const stops = [
    ...(['viewport:changed', 'page:changed', 'graph:replaced'] as const).map((event) =>
      editor.onEditorEvent(event, () => stopViewportTween(editor))
    ),
    // The page's view is saved for coming back to it, so it is saved where the glide was going.
    editor.onEditorEvent('page:leaving', () => stopViewportTween(editor, true))
  ]
  const tween: RunningTween = {
    target,
    frame: 0,
    stopListening: () => {
      for (const stop of stops) stop()
    }
  }
  const start = performance.now()
  const step = (now: number) => {
    const t = (now - start) / VIEWPORT_TWEEN_MS
    if (t >= 1) {
      stopViewportTween(editor, true)
      return
    }
    show(editor, interpolateViewport(from, target, easeViewport(t)))
    tween.frame = requestAnimationFrame(step)
  }
  running.set(editor.state, tween)
  show(editor, from)
  tween.frame = requestAnimationFrame(step)
}
