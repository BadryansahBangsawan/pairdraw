import type { OverflowDirection } from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

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

/**
 * How far to pan a screen that scrolls by panning so a layer drawn at `reveal` meets the stage's
 * top left, along the axes the screen scrolls, without panning past either end of the screen.
 */
export function revealPan(
  frame: Rect,
  reveal: Vector,
  overflow: OverflowDirection,
  view: { panX: number; panY: number; zoom: number },
  stage: { width: number; height: number }
): { dx: number; dy: number } {
  const { panX, panY, zoom } = view
  const along = (start: number, length: number, stageLength: number, at: number, pan: number) => {
    const ends = [stageLength - (start + length) * zoom, -start * zoom]
    const lowest = Math.min(...ends)
    const highest = Math.max(...ends)
    return Math.min(highest, Math.max(lowest, -at * zoom)) - pan
  }
  const vertical = overflow === 'VERTICAL' || overflow === 'BOTH'
  const horizontal = overflow === 'HORIZONTAL' || overflow === 'BOTH'
  return {
    dx: horizontal ? along(frame.x, frame.width, stage.width, reveal.x, panX) : 0,
    dy: vertical ? along(frame.y, frame.height, stage.height, reveal.y, panY) : 0
  }
}
