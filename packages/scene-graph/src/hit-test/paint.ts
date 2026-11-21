// Which layers show a paint where a pointer lands, so their area takes it.
import type { SceneNode } from '../types'

/**
 * Whether a paint shows, so its container's empty area counts when a click reaches past
 * containers: a paint at 0% opacity, or a gradient whose stops are all transparent, does not,
 * while 1% does, and the layer's own opacity does not matter.
 */
function isHitPaint(paint: SceneNode['fills'][number]): boolean {
  if (!paint.visible || !(paint.opacity > 0)) return false
  if (paint.type === 'SOLID') return paint.color.a > 0
  if (
    paint.type === 'GRADIENT_LINEAR' ||
    paint.type === 'GRADIENT_RADIAL' ||
    paint.type === 'GRADIENT_ANGULAR' ||
    paint.type === 'GRADIENT_DIAMOND'
  )
    return (paint.gradientStops ?? []).some((stop) => stop.color.a > 0)
  return true
}

export function showsPaint(node: SceneNode): boolean {
  return node.fills.some(isHitPaint) || node.strokes.some(isHitPaint)
}
