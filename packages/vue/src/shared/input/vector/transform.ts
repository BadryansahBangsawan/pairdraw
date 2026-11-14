import type { Editor } from '@pairdraw/core'
import {
  transformZoneAt,
  type CornerPosition,
  type HandlePosition,
  type TransformZone
} from '@pairdraw/core/geometry'
import {
  nearestPointOnNetwork,
  scalesBox,
  transformBoxPoints,
  vectorPointsBox,
  type ScaleBoxOptions
} from '@pairdraw/core/vector'
import type { VectorNetwork } from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'
import { cloneVectorNetwork } from '@pairdraw/scene-graph/vector-network'

import { buildResizeCursor, buildRotationCursor } from '#vue/shared/input/geometry'
import type { DragBendSegment, DragEditTransform, DragState } from '#vue/shared/input/types'
import {
  getNodeEditState,
  hitTestEditSegment,
  hitTestEditVertex,
  NODE_HIT_THRESHOLD,
  type NodeEditState
} from '#vue/shared/input/vector/hit-test'

type NodeEditTransformEditor = Partial<{
  nodeEditPushHistory: () => void
  nodeEditBendSegment: (
    origin: VectorNetwork,
    segmentIndex: number,
    t: number,
    delta: Vector,
    keepNeighbours: boolean
  ) => void
  nodeEditScalePoints: (
    origin: VectorNetwork,
    points: readonly number[],
    box: Rect,
    handle: HandlePosition,
    offset: Vector,
    options: ScaleBoxOptions
  ) => void
  nodeEditRotatePoints: (
    origin: VectorNetwork,
    points: readonly number[],
    box: Rect,
    from: Vector,
    to: Vector,
    snap: boolean
  ) => void
}>

type Modifiers = Pick<MouseEvent, 'altKey' | 'shiftKey' | 'metaKey' | 'ctrlKey'>

function snapshot(es: NodeEditState): VectorNetwork {
  return cloneVectorNetwork({ vertices: es.vertices, segments: es.segments, regions: es.regions })
}

/**
 * The points the transform box holds and the box around them, or `null` while it has none: only
 * the Select tool's presses reach the box, so the cut and pen tools have none.
 */
function selectedPointsBox(
  editor: Editor,
  es: NodeEditState
): { points: number[]; box: Rect } | null {
  if (es.cutTool || editor.state.activeTool !== 'SELECT') return null
  const points = transformBoxPoints(es, es.selectedVertexIndices, es.selectedSegmentIndices)
  const box = vectorPointsBox(es.vertices, points)
  return box ? { points, box } : null
}

/**
 * The part of the transform box around the selected points under a canvas point, as the selection
 * box of a layer takes it: a corner or edge scales, and just outside a corner turns. Points and
 * segments of the path win over every part of the box, so both can still be dragged; a band that
 * would stretch a flat side does nothing, so it takes nothing. ⌘/Ctrl leaves the box to bends.
 */
function editTransformZoneAt(
  editor: Editor,
  cx: number,
  cy: number,
  modifiers?: Pick<Modifiers, 'metaKey' | 'ctrlKey'>
): { zone: TransformZone; points: number[]; box: Rect } | null {
  if (modifiers && (modifiers.metaKey || modifiers.ctrlKey)) return null
  const es = getNodeEditState(editor)
  const selection = es ? selectedPointsBox(editor, es) : null
  if (!selection) return null
  const zone = transformZoneAt({ x: cx, y: cy }, selection.box, editor.state.zoom)
  if (!zone || (zone.kind === 'resize' && !scalesBox(selection.box, zone.handle))) return null
  if (hitTestEditVertex(editor, cx, cy) !== null || hitTestEditSegment(editor, cx, cy) !== null)
    return null
  return { zone, ...selection }
}

/** Starts scaling or turning the selected points from their transform box; false off the box. */
export function tryStartPointsTransform(
  e: Modifiers,
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (d: DragState) => void
): boolean {
  const es = getNodeEditState(editor)
  const hit = editTransformZoneAt(editor, cx, cy, e)
  if (!es || !hit) return false
  ;(editor as Editor & NodeEditTransformEditor).nodeEditPushHistory?.()
  setDrag({
    type: 'edit-transform',
    zone: hit.zone,
    points: hit.points,
    box: hit.box,
    startX: cx,
    startY: cy,
    origin: snapshot(es)
  })
  return true
}

/**
 * Starts bending a segment pressed with ⌘/Ctrl, as in Figma: the segment becomes the selection and
 * the point pressed on it follows the pointer. False when no segment is under the press.
 */
export function tryStartSegmentBend(
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (d: DragState) => void
): boolean {
  const es = getNodeEditState(editor)
  if (!es) return false
  const origin = snapshot(es)
  const hit = nearestPointOnNetwork(cx, cy, origin, NODE_HIT_THRESHOLD / editor.state.zoom)
  if (!hit) return false
  es.selectedHandles = new Set()
  es.selectedVertexIndices = new Set()
  es.selectedRegions = new Set()
  es.selectedSegmentIndices = new Set([hit.segmentIndex])
  ;(editor as Editor & NodeEditTransformEditor).nodeEditPushHistory?.()
  editor.requestRepaint()
  setDrag({
    type: 'bend-segment',
    segmentIndex: hit.segmentIndex,
    t: hit.t,
    startX: cx,
    startY: cy,
    origin
  })
  return true
}

/**
 * Moves a segment bend or a transform box drag: ⌥/Alt bends without turning the neighbouring
 * handles, or scales from the box's centre; Shift keeps the box's proportions or turns in steps.
 */
export function handleNodeEditTransformMove(
  d: DragBendSegment | DragEditTransform,
  cx: number,
  cy: number,
  e: Pick<Modifiers, 'altKey' | 'shiftKey'>,
  editor: Editor
) {
  const methods = editor as Editor & NodeEditTransformEditor
  const offset = { x: cx - d.startX, y: cy - d.startY }
  if (d.type === 'bend-segment') {
    methods.nodeEditBendSegment?.(d.origin, d.segmentIndex, d.t, offset, e.altKey)
    return
  }
  if (d.zone.kind === 'rotate') {
    const from = { x: d.startX, y: d.startY }
    methods.nodeEditRotatePoints?.(d.origin, d.points, d.box, from, { x: cx, y: cy }, e.shiftKey)
    return
  }
  methods.nodeEditScalePoints?.(d.origin, d.points, d.box, d.zone.handle, offset, {
    uniform: e.shiftKey,
    fromCenter: e.altKey
  })
}

/** Which way each corner points out of the box, for the cursors. */
const CORNER_DIRECTIONS: Record<CornerPosition, Vector> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 }
}

/** The angle the resize cursor points along for each handle, as for a layer's selection box. */
const RESIZE_CURSOR_ANGLES: Record<HandlePosition, number> = {
  nw: 45,
  n: 90,
  ne: 135,
  e: 0,
  se: 225,
  s: 270,
  sw: 315,
  w: 180
}

/**
 * The resize or rotate cursor over the transform box around the selected points, if any; none while
 * ⌘/Ctrl is held, since a press then bends or marquees instead.
 */
export function editTransformCursor(
  editor: Editor,
  cx: number,
  cy: number,
  modHeld = false
): string | null {
  const hit = editTransformZoneAt(editor, cx, cy, { metaKey: modHeld, ctrlKey: false })
  if (!hit) return null
  if (hit.zone.kind === 'resize') return buildResizeCursor(RESIZE_CURSOR_ANGLES[hit.zone.handle])
  const direction = CORNER_DIRECTIONS[hit.zone.corner]
  return buildRotationCursor((Math.atan2(direction.y, direction.x) * 180) / Math.PI + 135)
}
