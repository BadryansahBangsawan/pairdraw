import type { Editor } from '@pairdraw/core'

import cutCursorSVG from '#vue/shared/assets/cursors/cut.svg?raw'
import { getNodeEditState } from '#vue/shared/input/vector/hit-test'
import { editTransformCursor } from '#vue/shared/input/vector/transform'

/** Scissors, cutting where their blades cross. */
export const CUT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(cutCursorSVG)}") 16 16, crosshair`

/**
 * The cursor over a path being edited: the scissors while the cut tool is picked up, and over the
 * transform box around selected points, its resize or rotate cursor unless ⌘/Ctrl is held.
 */
export function nodeEditCursor(
  editor: Editor,
  cx: number,
  cy: number,
  modHeld = false
): string | null {
  if (getNodeEditState(editor)?.cutTool) return CUT_CURSOR
  return editTransformCursor(editor, cx, cy, modHeld)
}
