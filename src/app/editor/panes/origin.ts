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
