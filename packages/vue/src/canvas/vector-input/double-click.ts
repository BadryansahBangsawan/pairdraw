import type { Editor } from '@pairdraw/core'

import {
  getNodeEditState,
  hitTestEditSegment,
  hitTestEditVertex
} from '#vue/shared/input/vector/hit-test'

type NodeEditDoubleClickMethods = Partial<{
  nodeEditToggleVertexSmooth: (vertexIndex: number) => void
  nodeEditStraightenSegment: (segmentIndex: number) => void
}>

/**
 * A double-click on the path being edited, as in Figma: on a point it switches the point between
 * smooth and corner, and with ⌘/Ctrl on a segment it removes the segment's handles. Anywhere else
 * it does nothing, so the path stays open with its selection. False when no path is being edited.
 */
export function handleNodeEditDoubleClick(
  e: Pick<MouseEvent, 'metaKey' | 'ctrlKey'>,
  cx: number,
  cy: number,
  editor: Editor
): boolean {
  const es = getNodeEditState(editor)
  if (!es) return false
  // The pen and the cut tool act on each press; their double-clicks are two presses.
  if (es.cutTool || editor.state.activeTool !== 'SELECT') return true
  const methods = editor as Editor & NodeEditDoubleClickMethods
  const modified = e.metaKey || e.ctrlKey

  const vertex = hitTestEditVertex(editor, cx, cy)
  if (vertex !== null) {
    // ⌘/Ctrl-clicking a point already makes it a corner.
    if (!modified) methods.nodeEditToggleVertexSmooth?.(vertex)
    return true
  }

  const segment = hitTestEditSegment(editor, cx, cy)
  if (segment !== null && modified) methods.nodeEditStraightenSegment?.(segment)
  return true
}
