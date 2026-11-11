import { editedImage, editedImageLayout, imageEditChanges, type Editor } from '@open-pencil/core'
import {
  createSceneGeometry,
  hitTestImageCrop,
  imageCropHitDirection,
  viewportMatrix,
  type ImageCropHit
} from '@open-pencil/core/geometry'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { MOVE_CURSOR, buildResizeCursor } from '#vue/shared/input/geometry'
import type { DragImageCrop, DragState } from '#vue/shared/input/types'

/** What a press at a screen point takes while an image is edited, if anything. */
function imageCropHitAt(editor: Editor, sx: number, sy: number): ImageCropHit | null {
  const layout = editedImageLayout(editor.graph, editor.state.imageEdit, editor.state)
  return layout ? hitTestImageCrop(layout, { x: sx, y: sy }) : null
}

/** The cursor over an image being edited: resize over a handle, move over the image. */
export function imageCropCursor(editor: Editor, sx: number, sy: number): string | null {
  const layout = editedImageLayout(editor.graph, editor.state.imageEdit, editor.state)
  const hit = layout && hitTestImageCrop(layout, { x: sx, y: sy })
  if (!layout || !hit) return null
  const direction = imageCropHitDirection(layout, hit)
  if (!direction) return MOVE_CURSOR
  return buildResizeCursor((Math.atan2(direction.y, direction.x) * 180) / Math.PI)
}

/**
 * Starts a drag in image edit mode: a crop handle moves the layer's edges over the still image,
 * an image corner scales the image, and the image itself moves behind the layer. Shift keeps
 * proportions or one axis and Alt works about the centre; each drag is one undo step. A press
 * outside the image and the layer leaves the mode and is handled as usual.
 */
export function tryStartImageCropDrag(
  editor: Editor,
  sx: number,
  sy: number,
  setDrag: (drag: DragState) => void
): boolean {
  const edit = editor.state.imageEdit
  const live = editedImage(editor.graph, edit)
  if (!edit || !live) return false
  const hit = imageCropHitAt(editor, sx, sy)
  if (!hit || !editor.canEditImage(edit.nodeId, edit.index)) {
    editor.endImageEdit()
    return false
  }
  // Each preview writes into the live layer, so the drag works from the layer as it was pressed:
  // its size and framing, and the matrix that maps the pointer into its pixels.
  const edited = { ...live, node: { ...live.node } }
  const { node } = edited
  const fromCanvas = Matrix.invert(createSceneGeometry(editor.graph).worldMatrix(node))
  if (!fromCanvas) return false
  const toLocal = (x: number, y: number): Vector | null => {
    const fromScreen = Matrix.invert(viewportMatrix(editor.state))
    return fromScreen ? Matrix.mapPoint(fromCanvas, Matrix.mapPoint(fromScreen, { x, y })) : null
  }
  const start = toLocal(sx, sy)
  if (!start) return false
  const preview = editor.beginNodePreview(hit.kind === 'crop' ? 'Crop image' : 'Reframe image')

  const drag: DragImageCrop = {
    type: 'image-crop',
    update(screenX, screenY, modifiers) {
      const to = toLocal(screenX, screenY)
      if (!to) return
      const changes = imageEditChanges(edited, hit, start, to, modifiers)
      if (Object.keys(changes).length > 0) preview.update(node.id, changes)
    },
    commit: () => preview.commit(),
    cancel: () => preview.cancel()
  }
  setDrag(drag)
  return true
}
