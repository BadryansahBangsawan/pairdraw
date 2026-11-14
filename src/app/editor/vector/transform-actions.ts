import type { Editor } from '@pairdraw/core'
import { ROTATION_SNAP_DEGREES } from '@pairdraw/core/constants'
import type { HandlePosition } from '@pairdraw/core/geometry'
import {
  bendSegment,
  boxCorners,
  rotateBoxMatrix,
  rotationAbout,
  scaleBoxMatrix,
  transformVectorPoints,
  type ScaleBoxOptions
} from '@pairdraw/core/vector'
import type { VectorNetwork } from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

import { setNodeEditNetwork } from './network'
import type { NodeEditState } from './types'

/**
 * Bends and transforms on the path being edited, driven by a drag: each move rebuilds the path from
 * `origin`, the path as the press found it, so a drag can come back to where it started. The press
 * snapshots the path for undo and the release commits it, so a whole drag is one undo step.
 */
export function createVectorEditTransformActions(
  editor: Editor,
  getNodeEditState: () => NodeEditState | null
) {
  /**
   * Bends a segment so its point at `t` moves by `delta`, as ⌘/Ctrl dragging it does;
   * `keepNeighbours` (⌘/Ctrl+⌥/Alt) leaves the handles of the segments beside it alone.
   */
  function nodeEditBendSegment(
    origin: VectorNetwork,
    segmentIndex: number,
    t: number,
    delta: Vector,
    keepNeighbours: boolean
  ) {
    const es = getNodeEditState()
    if (!es || segmentIndex < 0 || segmentIndex >= origin.segments.length) return
    setNodeEditNetwork(es, bendSegment(origin, segmentIndex, t, delta, { keepNeighbours }))
    editor.requestRepaint()
  }

  function applyPointsMatrix(
    origin: VectorNetwork,
    points: readonly number[],
    box: Rect,
    matrix: ReturnType<typeof scaleBoxMatrix>
  ) {
    const es = getNodeEditState()
    if (!es) return
    setNodeEditNetwork(es, transformVectorPoints(origin, points, matrix))
    es.transformBox = boxCorners(box, matrix)
    editor.requestRepaint()
  }

  /** Scales the selected points by dragging a handle of their box by `offset`. */
  function nodeEditScalePoints(
    origin: VectorNetwork,
    points: readonly number[],
    box: Rect,
    handle: HandlePosition,
    offset: Vector,
    options: ScaleBoxOptions
  ) {
    applyPointsMatrix(origin, points, box, scaleBoxMatrix(box, handle, offset, options))
  }

  /**
   * Turns the selected points about the centre of their box as the pointer goes from `from` to
   * `to`; `snap` (Shift) turns them in 15° steps.
   */
  function nodeEditRotatePoints(
    origin: VectorNetwork,
    points: readonly number[],
    box: Rect,
    from: Vector,
    to: Vector,
    snap: boolean
  ) {
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const angle = rotationAbout(center, from, to, snap ? ROTATION_SNAP_DEGREES : 0)
    applyPointsMatrix(origin, points, box, rotateBoxMatrix(center, angle))
  }

  /** Ends a transform box drag: the box goes back to fitting the selected points. */
  function nodeEditEndPointsTransform() {
    const es = getNodeEditState()
    if (!es?.transformBox) return
    es.transformBox = null
    editor.requestRepaint()
  }

  return {
    nodeEditBendSegment,
    nodeEditScalePoints,
    nodeEditRotatePoints,
    nodeEditEndPointsTransform
  }
}
