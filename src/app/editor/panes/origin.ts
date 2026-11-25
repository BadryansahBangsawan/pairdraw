import type { Vector } from '@pairdraw/scene-graph/primitives'

/**
 * Where each canvas sat on screen when it last drew. Hiding a panel can remount the canvas at a
 * new place instead of moving it, which the surface cannot report as a move, so the next mount
 * compares against this and pans the view the same way.
 */
const canvasOrigins = new Map<string, Vector>()

export function readCanvasOrigin(key: string): Vector | null {
  return canvasOrigins.get(key) ?? null
}

export function writeCanvasOrigin(key: string, origin: Vector): void {
  canvasOrigins.set(key, origin)
}

/**
 * How far the pane must pan so the drawing stays where it was when the canvas mounted at `box`,
 * or null when there is nothing to carry. While a presentation is on screen the canvas belongs to
 * its stage, not the pane: the stage fits the slide itself, so its geometry is neither read nor
 * recorded, and leaving the presentation does not pan the edit view by the panels' width.
 */
export function trackCanvasOrigin(
  key: string,
  box: Vector,
  presenting = false
): { dx: number; dy: number } | null {
  if (presenting) return null
  const previous = readCanvasOrigin(key)
  writeCanvasOrigin(key, box)
  if (!previous) return null
  const dx = previous.x - box.x
  const dy = previous.y - box.y
  return dx !== 0 || dy !== 0 ? { dx, dy } : null
}
