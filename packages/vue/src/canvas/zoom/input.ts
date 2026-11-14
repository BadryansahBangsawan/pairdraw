import type { Editor } from '@pairdraw/core'
import type { Rect } from '@pairdraw/scene-graph/primitives'

import { animateViewport } from '#vue/canvas/viewport/tween'
import { isPastPointerDragThreshold } from '#vue/shared/input/drag-threshold'
import type { DragZoom } from '#vue/shared/input/types'

/** How far one click of the zoom tool zooms in, or out with ⌥ or Alt. */
export const ZOOM_TOOL_STEP = 2

/** The zoom tool's cursor: a magnifier that zooms in, or out while ⌥ or Alt is held. */
export function zoomToolCursor(altKey: boolean): string {
  return altKey ? 'zoom-out' : 'zoom-in'
}

function areaBetween(startX: number, startY: number, cx: number, cy: number): Rect {
  return {
    x: Math.min(startX, cx),
    y: Math.min(startY, cy),
    width: Math.abs(cx - startX),
    height: Math.abs(cy - startY)
  }
}

/**
 * A press of the zoom tool, as in Figma: a click zooms in on the pointer, or out with ⌥ or Alt,
 * and a drag frames an area that the release zooms to. The view glides there.
 */
export function startZoomDrag(
  cx: number,
  cy: number,
  sx: number,
  sy: number,
  altKey: boolean,
  editor: Editor
): DragZoom {
  let alt = altKey
  let area: Rect | null = null
  const drag: DragZoom = {
    type: 'zoom',
    update(x, y, screenX, screenY, altHeld) {
      alt = altHeld
      if (!area && !isPastPointerDragThreshold(sx, sy, screenX, screenY)) return
      area = areaBetween(cx, cy, x, y)
      editor.setMarquee(area)
    },
    commit() {
      editor.setMarquee(null)
      const dragged = area
      if (dragged) {
        animateViewport(editor, () =>
          editor.zoomToArea(
            dragged.x,
            dragged.y,
            dragged.x + dragged.width,
            dragged.y + dragged.height
          )
        )
        return
      }
      const zoom = alt ? editor.state.zoom / ZOOM_TOOL_STEP : editor.state.zoom * ZOOM_TOOL_STEP
      animateViewport(editor, () => editor.setZoomAroundPoint(zoom, sx, sy))
    },
    cancel() {
      area = null
      editor.setMarquee(null)
    }
  }
  return drag
}
