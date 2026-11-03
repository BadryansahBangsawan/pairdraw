import { resolveEditorProfile, type Editor } from '@open-pencil/core'
import {
  createSceneGeometry,
  transformZoneAt,
  type HandlePosition
} from '@open-pencil/core/geometry'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Rect, Vector } from '@open-pencil/scene-graph/primitives'

import { buildResizeCursor, getHitHandleByMatrix } from '#vue/shared/input/geometry'
import { calculateResizeRect } from '#vue/shared/input/resize/rect'
import type { DragScale } from '#vue/shared/input/types'

/**
 * The box the Scale tool's handles sit on, in its own frame: a single layer's own box, turned
 * with it, or the joint box of a multi-layer selection on the canvas. It is a snapshot taken when
 * it is made, so a drag keeps measuring against the box as it was at the press while the layer
 * scales under it.
 */
export interface ScaleFrame {
  rect: Rect
  toLocal: (point: Vector) => Vector | null
  toWorld: (point: Vector) => Vector
}

/** Each handle's outward direction in the box's frame, which its cursor points along. */
const HANDLE_DIRECTIONS: Readonly<Record<HandlePosition, Vector>> = {
  nw: { x: 1, y: 1 },
  ne: { x: -1, y: 1 },
  se: { x: -1, y: -1 },
  sw: { x: 1, y: -1 },
  n: { x: 0, y: 1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: -1 },
  w: { x: -1, y: 0 }
}

/** The box the selection's Scale handles sit on; null when nothing selected can scale. */
export function scaleFrame(editor: Editor): ScaleFrame | null {
  const ids = [...editor.state.selectedIds]
  const bounds = editor.scaleSelectionBounds()
  if (!bounds) return null
  const single = ids.length === 1 ? editor.graph.getNode(ids[0]) : undefined
  if (!single) return { rect: bounds, toLocal: (point) => point, toWorld: (point) => point }
  const geometry = createSceneGeometry(editor.graph, editor.state.rotationPreview)
  const world = geometry.worldMatrix(single)
  const inverse = Matrix.invert(world)
  return {
    rect: { x: 0, y: 0, width: single.width, height: single.height },
    toLocal: (point) => (inverse ? Matrix.mapPoint(inverse, point) : null),
    toWorld: (point) => Matrix.mapPoint(world, point)
  }
}

/** The Scale handle under a canvas point, if any. */
export function scaleHandleAt(
  frame: ScaleFrame,
  cx: number,
  cy: number,
  zoom: number
): HandlePosition | null {
  const local = frame.toLocal({ x: cx, y: cy })
  const zone = local ? transformZoneAt(local, frame.rect, zoom) : null
  return zone?.kind === 'resize' ? zone.handle : null
}

/** The resize cursor along a Scale handle's direction on the canvas. */
export function scaleHandleCursor(frame: ScaleFrame, handle: HandlePosition): string {
  const origin = frame.toWorld({ x: 0, y: 0 })
  const tip = frame.toWorld(HANDLE_DIRECTIONS[handle])
  return buildResizeCursor((Math.atan2(tip.y - origin.y, tip.x - origin.x) * 180) / Math.PI)
}

/** The point of the box each handle scales from, as fractions of it: the opposite side or corner. */
const HANDLE_ORIGINS: Readonly<Record<HandlePosition, Vector>> = {
  nw: { x: 1, y: 1 },
  n: { x: 0.5, y: 1 },
  ne: { x: 0, y: 1 },
  e: { x: 0, y: 0.5 },
  se: { x: 0, y: 0 },
  s: { x: 0.5, y: 0 },
  sw: { x: 1, y: 0 },
  w: { x: 1, y: 0.5 }
}

/** The point a handle scales from: the opposite corner or side, or the center. */
export function scaleOrigin(rect: Rect, handle: HandlePosition, fromCenter: boolean): Vector {
  const { x, y } = fromCenter ? { x: 0.5, y: 0.5 } : HANDLE_ORIGINS[handle]
  return { x: rect.x + rect.width * x, y: rect.y + rect.height * y }
}

/**
 * The factor a handle dragged by (dx, dy) in the box's frame scales by, keeping proportions as a
 * Shift resize from the same handle would; a box with no height or width scales along the side
 * it has. From the center, the drag counts on both sides.
 */
export function scaleFactorFromDrag(
  rect: Rect,
  handle: HandlePosition,
  dx: number,
  dy: number,
  fromCenter: boolean
): number {
  const k = fromCenter ? 2 : 1
  const { width, height } = rect
  if (width > 0 && height > 0) {
    return calculateResizeRect(handle, rect, dx * k, dy * k, width / height).width / width
  }
  if (width > 0) return calculateResizeRect(handle, rect, dx * k, 0, null).width / width
  if (height > 0) return calculateResizeRect(handle, rect, 0, dy * k, null).height / height
  return 1
}

/**
 * Starts a Scale tool drag when the press is on a handle of the selection: the selection scales
 * with its text, strokes, effects, and spacing from the opposite handle, or from its center with
 * ⌥ or Alt, as in Figma. Null when the press is elsewhere.
 */
export function tryStartScaleDrag(cx: number, cy: number, editor: Editor): DragScale | null {
  if (!resolveEditorProfile(editor.state).edits) return null
  const frame = scaleFrame(editor)
  if (!frame) return null
  const handle = scaleHandleAt(frame, cx, cy, editor.renderer?.zoom ?? editor.state.zoom)
  const start = frame.toLocal({ x: cx, y: cy })
  if (!handle || !start) return null
  const session = editor.beginScale(editor.state.selectedIds)
  if (!session) return null
  const show = (x: number, y: number, fromCenter: boolean) => {
    const local = frame.toLocal({ x, y })
    if (!local) return
    const factor = scaleFactorFromDrag(
      frame.rect,
      handle,
      local.x - start.x,
      local.y - start.y,
      fromCenter
    )
    session.update(factor, frame.toWorld(scaleOrigin(frame.rect, handle, fromCenter)))
  }
  return {
    type: 'scale',
    cursor: scaleHandleCursor(frame, handle),
    update: (x, y, _sx, _sy, altHeld) => show(x, y, altHeld),
    commit: () => session.commit(),
    cancel: () => session.cancel()
  }
}

/** The cursor over the selection's Scale handles, or null away from them. */
export function scaleHoverCursor(cx: number, cy: number, editor: Editor): string | null {
  if (!resolveEditorProfile(editor.state).edits) return null
  const frame = scaleFrame(editor)
  const handle = frame && scaleHandleAt(frame, cx, cy, editor.renderer?.zoom ?? editor.state.zoom)
  return frame && handle ? scaleHandleCursor(frame, handle) : null
}

/**
 * Whether a canvas point is on a handle drawn for the selection. With the Scale tool on, such a
 * press never falls back to the Move tool's resize, which would leave strokes, text, and effects
 * as they were: a handle of a selection that cannot scale, such as a section or a layer in an
 * instance, or of a locked layer outside the scale box, does nothing.
 */
export function onSelectionHandle(cx: number, cy: number, editor: Editor): boolean {
  const zoom = editor.renderer?.zoom ?? editor.state.zoom
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    if (
      node &&
      getHitHandleByMatrix(cx, cy, node, editor.graph, zoom, editor.state.rotationPreview)
    ) {
      return true
    }
  }
  return false
}
