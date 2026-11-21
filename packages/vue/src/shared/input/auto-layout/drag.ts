import type { Editor } from '@pairdraw/core'
import {
  autoLayoutDragChanges,
  hitAutoLayoutHandle,
  measureAutoLayoutHandles,
  type AutoLayoutHandleHit,
  type AutoLayoutHandleLayout
} from '@pairdraw/core/layout'
import type { SceneNode } from '@pairdraw/scene-graph'
import { isGeneratedFrame } from '@pairdraw/scene-graph/generated'

import { isPastPointerDragThreshold } from '#vue/shared/input/drag-threshold'
import type { DragAutoLayout, DragState } from '#vue/shared/input/types'

const HANDLE_DRAG_THRESHOLD_PX = 5

function visibleChildren(editor: Editor, node: SceneNode): SceneNode[] {
  return node.childIds
    .map((id) => editor.graph.getNode(id))
    .filter((child): child is SceneNode => !!child)
}

/** The hover state that keeps the pink zone and its value pill on while a handle is dragged. */
function dragHover(node: SceneNode, hit: AutoLayoutHandleHit) {
  if (hit.kind === 'padding') {
    return { nodeId: node.id, kind: 'padding-value' as const, side: hit.side }
  }
  return {
    nodeId: node.id,
    kind: 'spacing-value' as const,
    axis: hit.axis,
    index: hit.index
  }
}

/**
 * Starts dragging a padding edge or an item gap of the selected auto layout frame. Alt edits the
 * opposite side on the dragged axis (with Shift, every side); Shift moves padding or spacing by
 * the large nudge; the drag previews on the frame and commits as one undo step.
 */
export function tryStartAutoLayoutHandleDrag(
  editor: Editor,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  setDrag: (drag: DragState) => void,
  bigNudge = 10
): boolean {
  if (editor.state.selectedIds.size !== 1) return false
  const nodeId = [...editor.state.selectedIds][0]
  const node = editor.graph.getNode(nodeId)
  if (
    !node ||
    isGeneratedFrame(node) ||
    (node.layoutMode !== 'HORIZONTAL' && node.layoutMode !== 'VERTICAL')
  )
    return false
  const layout = measureAutoLayoutHandles(node, visibleChildren(editor, node))
  if (!layout?.editable) return false
  const abs = editor.graph.getAbsolutePosition(node.id)
  const hit = hitAutoLayoutHandle(layout, cx - abs.x, cy - abs.y)
  if (!hit) return false

  const handleLayout: AutoLayoutHandleLayout = layout
  const handleHit: AutoLayoutHandleHit = hit
  const target = node
  const preview = editor.beginNodePreview('Adjust auto layout')
  let moved = false

  function update(screenX: number, screenY: number, altKey: boolean, shiftKey: boolean) {
    moved ||= isPastPointerDragThreshold(sx, sy, screenX, screenY, HANDLE_DRAG_THRESHOLD_PX)
    if (!moved || preview.closed) return
    const current = editor.graph.getNode(target.id)
    if (!current) return
    const next = autoLayoutDragChanges(handleLayout, handleHit, {
      dx: screenX - sx,
      dy: screenY - sy,
      zoom: editor.state.zoom,
      alt: altKey,
      shift: shiftKey,
      bigNudge
    })
    preview.update(target.id, next.changes)
    editor.setAutoLayoutHover(dragHover(target, handleHit))
  }

  const drag: DragAutoLayout = {
    type: 'auto-layout',
    update,
    commit: () => preview.commit(),
    cancel: () => preview.cancel()
  }
  editor.setAutoLayoutHover(dragHover(target, handleHit))
  setDrag(drag)
  return true
}
