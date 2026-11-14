import type { Editor } from '@pairdraw/core'

import { selectedTopLevelGuideFrameId, type createGuideInput } from '#vue/canvas/guides/input'
import { handlePenDragMove } from '#vue/canvas/pen/input'
import { handlePencilDragMove } from '#vue/canvas/pencil/input'
import type { createCanvasTransformInput } from '#vue/canvas/transform/input'
import { handleBendHandleMove } from '#vue/canvas/vector-input/input'
import { attachModifiers, handleConnectorDrawMove } from '#vue/shared/input/connector/draw'
import { handleDrawMove } from '#vue/shared/input/draw'
import { handleMoveMove } from '#vue/shared/input/move/drag'
import { applyResize } from '#vue/shared/input/resize'
import { applyStickyScale } from '#vue/shared/input/sticky/scale'
import type { DragState } from '#vue/shared/input/types'
import { handleNodeEditMarqueeMove, handleNodeEditMove } from '#vue/shared/input/vector'
import { handleNodeEditTransformMove } from '#vue/shared/input/vector/transform'

type TransformInput = ReturnType<typeof createCanvasTransformInput>

/** What a drag in progress reaches while the pointer moves. */
export interface DragMoveContext {
  editor: Editor
  guideInput: Pick<ReturnType<typeof createGuideInput>, 'handleMove'>
  transform: Pick<
    TransformInput,
    'handlePanMove' | 'handleRotateMove' | 'handleTextSelectMove' | 'handleMarqueeMove'
  >
  /** Whether Space is held, which moves a pen handle's anchor instead of the handle. */
  spaceHeld: () => boolean
}

/** Pointer position on screen (`sx`, `sy`) and on the canvas (`cx`, `cy`). */
interface DragMovePointer {
  sx: number
  sy: number
  cx: number
  cy: number
}

/** Moves the drag in progress to the pointer, for each kind of drag the canvas starts. */
// Dispatching the full drag union is intentionally centralized here.
// eslint-disable-next-line complexity
export function moveDrag(
  d: DragState,
  e: MouseEvent,
  { sx, sy, cx, cy }: DragMovePointer,
  { editor, guideInput, transform, spaceHeld }: DragMoveContext
): void {
  if (d.type === 'pan') {
    transform.handlePanMove(d, e)
    return
  }

  if (d.type === 'gradient' || d.type === 'shape-handle') {
    d.update(sx, sy, e.shiftKey)
    return
  }

  if (d.type === 'image-crop') {
    d.update(sx, sy, { shift: e.shiftKey, alt: e.altKey })
    return
  }

  if (d.type === 'guide') {
    const frameId = e.altKey && !d.guideId ? selectedTopLevelGuideFrameId(editor) : null
    guideInput.handleMove(
      d,
      sx,
      sy,
      cx,
      cy,
      frameId ? { frameId, deep: e.metaKey || e.ctrlKey } : undefined
    )
    return
  }

  if (d.type === 'rotate') {
    transform.handleRotateMove(d, cx, cy, e.shiftKey)
    return
  }
  if (d.type === 'move') {
    handleMoveMove(d, cx, cy, sx, sy, editor, { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey })
    return
  }
  if (d.type === 'text-select') {
    transform.handleTextSelectMove(cx, cy)
    return
  }
  if (d.type === 'resize') {
    applyResize(d, cx, cy, e.shiftKey, editor, e.ctrlKey)
    return
  }

  if (d.type === 'pen-drag') {
    handlePenDragMove(d, cx, cy, spaceHeld(), e, editor)
    return
  }

  if (d.type === 'pencil-drag') {
    handlePencilDragMove(cx, cy, e.shiftKey, editor)
    return
  }

  if (d.type === 'edit-node' || d.type === 'edit-handle') {
    handleNodeEditMove(d, cx, cy, editor, e.altKey, e.metaKey || e.ctrlKey, e.shiftKey, e.ctrlKey)
    return
  }

  if (d.type === 'bend-handle') {
    handleBendHandleMove(d, cx, cy, e, editor)
    return
  }

  if (d.type === 'bend-segment' || d.type === 'edit-transform') {
    handleNodeEditTransformMove(d, cx, cy, e, editor)
    return
  }

  if (d.type === 'edit-marquee') {
    handleNodeEditMarqueeMove(d, cx, cy, editor)
    return
  }

  if (d.type === 'draw') {
    handleDrawMove(d, cx, cy, e.shiftKey)
    return
  }

  if (d.type === 'sticky-draw') {
    d.move(cx, cy)
    return
  }

  if (d.type === 'connector-draw') {
    handleConnectorDrawMove(d, cx, cy, sx, sy, editor, attachModifiers(e))
    return
  }

  if (d.type === 'connector-end') {
    editor.connectorEndpointDrag(cx, cy, attachModifiers(e))
    return
  }

  if (d.type === 'connector-line') {
    editor.connectorLineDrag(cx, cy)
    return
  }

  if (d.type === 'line-end') {
    editor.lineEndDrag(cx, cy, { shift: e.shiftKey, alt: e.altKey })
    return
  }

  if (d.type === 'sticky-scale') {
    applyStickyScale(d, cx, cy, editor)
    return
  }

  if (d.type === 'zoom' || d.type === 'scale') {
    d.update(cx, cy, sx, sy, e.altKey)
    return
  }

  // While ⌘ or Ctrl is held the marquee reaches nested layers, as in Figma.
  transform.handleMarqueeMove(d, cx, cy, e.metaKey || e.ctrlKey)
}
