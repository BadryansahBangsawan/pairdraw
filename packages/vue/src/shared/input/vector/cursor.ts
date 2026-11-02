import type { Editor } from '@open-pencil/core'

import cutCursorSVG from '#vue/shared/assets/cursors/cut.svg?raw'
import { getNodeEditState } from '#vue/shared/input/vector/hit-test'

/** Scissors, cutting where their blades cross. */
export const CUT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(cutCursorSVG)}") 16 16, crosshair`

/** The cursor over a path being edited: the scissors while the cut tool is picked up. */
export function nodeEditCursor(editor: Editor): string | null {
  return getNodeEditState(editor)?.cutTool ? CUT_CURSOR : null
}
