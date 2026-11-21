import type { OverflowDirection } from '@pairdraw/scene-graph'
import type { Rect } from '@pairdraw/scene-graph/primitives'

/**
 * The part of a frame play fits to the stage. A top-level frame that scrolls vertically and is
 * taller than the stage fits its full width from the top, and one that scrolls sideways and is
 * wider fits its full height from the left, so the canvas pans through the rest as Figma
 * scrolls a frame longer than its device; any other frame fits whole.
 */
export function playFitArea(
  frame: Rect,
  overflow: OverflowDirection,
  stage: { width: number; height: number }
): Rect {
  if (stage.width <= 0 || stage.height <= 0 || frame.width <= 0 || frame.height <= 0) return frame
  const stageRatio = stage.height / stage.width
  const vertical = overflow === 'VERTICAL' || overflow === 'BOTH'
  const horizontal = overflow === 'HORIZONTAL' || overflow === 'BOTH'
  if (vertical && frame.height / frame.width > stageRatio) {
    return { ...frame, height: frame.width * stageRatio }
  }
  if (horizontal && frame.height / frame.width < stageRatio) {
    return { ...frame, width: frame.height / stageRatio }
  }
  return frame
}
