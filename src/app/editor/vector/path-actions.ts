import type { Editor } from '@pairdraw/core'
import {
  cutAtVertex,
  cutSegmentAt,
  duplicateVectorParts,
  joinEndpoints,
  nearestPointOnNetwork,
  selectedVectorPoints,
  straightenSegment,
  toggleVertexSmooth,
  type VectorEditResult
} from '@pairdraw/core/vector'
import type { VectorNetwork } from '@pairdraw/scene-graph'

import { pushNodeEditHistory } from './history'
import { getLiveNetwork, setNodeEditNetwork } from './network'
import type { NodeEditState, VectorEditState } from './types'

/** How close, in screen pixels, the pointer must be to a point or a segment to act on it. */
const HIT_THRESHOLD = 8
/** End points closer than this many screen pixels are joined into one point. */
const JOIN_MERGE_DISTANCE = 1

/** The points a selection moves: selected points and the ends of selected segments. */
function selectedEditPoints(es: NodeEditState): number[] {
  return selectedVectorPoints(es, es.selectedVertexIndices, es.selectedSegmentIndices)
}

function isEndPoint(es: NodeEditState, vertex: number) {
  return es.segments.filter((s) => s.start === vertex || s.end === vertex).length === 1
}

/**
 * Edits on the shape of a path being edited: cutting, joining, duplicating, nudging, and switching
 * points between smooth and corner. Each one but duplicating snapshots the path for undo first.
 */
export function createVectorEditPathActions(
  editor: Editor,
  state: VectorEditState,
  getNodeEditState: () => NodeEditState | null
) {
  // Any other tool, or the pen picked from the toolbar, puts the cut tool down.
  editor.onEditorEvent('tool:changed', () => {
    const es = getNodeEditState()
    if (es?.cutTool) es.cutTool = false
  })

  function apply(es: NodeEditState, network: VectorNetwork, selected: number[]) {
    setNodeEditNetwork(es, network)
    es.selectedVertexIndices = new Set(selected)
    es.selectedSegmentIndices = new Set()
    es.selectedRegions = new Set()
    es.selectedHandles = new Set()
    editor.requestRender()
  }

  function applyResult(es: NodeEditState, result: VectorEditResult) {
    pushNodeEditHistory(es)
    apply(es, result.network, result.vertexIndices)
  }

  /** Picks up or puts down the cut tool (X); picking it up returns to selecting with the pointer. */
  function nodeEditSetCutTool(on: boolean) {
    const es = getNodeEditState()
    if (!es) return
    if (on) editor.setTool('SELECT')
    es.cutTool = on
    editor.requestRepaint()
  }

  /**
   * Cuts the path under a canvas point, as the cut tool does: at a point it parts the segments
   * there, and on a segment it splits the segment and parts the halves. False when nothing is near.
   */
  function nodeEditCutAt(cx: number, cy: number): boolean {
    const es = getNodeEditState()
    if (!es) return false
    const threshold = HIT_THRESHOLD / state.zoom
    const live = getLiveNetwork(es)
    const vertex = es.vertices.findIndex((v) => Math.hypot(cx - v.x, cy - v.y) < threshold)
    const nearest = vertex !== -1 ? null : nearestPointOnNetwork(cx, cy, live, threshold)
    if (vertex === -1 && !nearest) return false
    const result = nearest
      ? cutSegmentAt(live, nearest.segmentIndex, nearest.t)
      : cutAtVertex(live, vertex)
    // An end point has nothing to cut.
    if (result.network === live) return false
    applyResult(es, result)
    return true
  }

  /** Switches a point between smooth and corner, as double-clicking it does. */
  function nodeEditToggleVertexSmooth(vertexIndex: number) {
    const es = getNodeEditState()
    if (!es || vertexIndex < 0 || vertexIndex >= es.vertices.length) return
    const live = getLiveNetwork(es)
    const next = toggleVertexSmooth(live, vertexIndex)
    if (next === live) return
    pushNodeEditHistory(es)
    apply(es, next, [vertexIndex])
  }

  /** Removes a segment's handles, as ⌘/Ctrl double-clicking it does. */
  function nodeEditStraightenSegment(segmentIndex: number) {
    const es = getNodeEditState()
    if (!es || segmentIndex < 0 || segmentIndex >= es.segments.length) return
    const live = getLiveNetwork(es)
    const next = straightenSegment(live, segmentIndex)
    if (next === live) return
    pushNodeEditHistory(es)
    setNodeEditNetwork(es, next)
    es.selectedVertexIndices = new Set()
    es.selectedSegmentIndices = new Set([segmentIndex])
    es.selectedRegions = new Set()
    es.selectedHandles = new Set()
    editor.requestRender()
  }

  /**
   * Joins the two selected end points: points in the same place become one, others get a straight
   * segment between them. False unless exactly two end points are selected.
   */
  function nodeEditJoinEndpoints(): boolean {
    const es = getNodeEditState()
    if (!es) return false
    const ends = selectedEditPoints(es).filter((vertex) => isEndPoint(es, vertex))
    if (ends.length !== 2) return false
    const [a, b] = ends
    const result = joinEndpoints(getLiveNetwork(es), a, b, JOIN_MERGE_DISTANCE / state.zoom)
    if (!result) return false
    applyResult(es, result)
    return true
  }

  /**
   * Copies the selected points and segments, and the regions they wholly enclose, and selects the
   * copies, as ⌥/Alt dragging them does. The drag that copies has already snapshotted the path, so
   * this records nothing. Returns each copied point's original index mapped to its copy's.
   */
  function nodeEditDuplicateSelection(): Map<number, number> | null {
    const es = getNodeEditState()
    if (!es) return null
    const points = selectedEditPoints(es)
    if (points.length === 0) return null
    const result = duplicateVectorParts(getLiveNetwork(es), points, es.selectedSegmentIndices)
    const copies = (map: Map<number, number>, picked: Iterable<number>) =>
      [...picked].flatMap((index) => {
        const copy = map.get(index)
        return copy === undefined ? [] : [copy]
      })
    const segments = copies(result.segments, es.selectedSegmentIndices)
    const regions = copies(result.regions, es.selectedRegions)
    setNodeEditNetwork(es, result.network)
    es.selectedVertexIndices = new Set(copies(result.vertices, es.selectedVertexIndices))
    es.selectedSegmentIndices = new Set(segments)
    es.selectedRegions = new Set(regions)
    es.selectedHandles = new Set()
    editor.requestRender()
    return result.vertices
  }

  /**
   * Moves the selected points by a canvas distance, as the arrow keys do. `record` snapshots the
   * path first; a held key's repeats leave it off, so one undo takes back the whole press.
   * False when no point is selected.
   */
  function nodeEditNudgeSelected(dx: number, dy: number, record = true): boolean {
    const es = getNodeEditState()
    if (!es) return false
    const points = selectedEditPoints(es)
    if (points.length === 0) return false
    if (record) pushNodeEditHistory(es)
    for (const index of points) {
      const vertex = es.vertices.at(index)
      if (vertex) es.vertices[index] = { ...vertex, x: vertex.x + dx, y: vertex.y + dy }
    }
    editor.requestRender()
    return true
  }

  return {
    nodeEditSetCutTool,
    nodeEditCutAt,
    nodeEditToggleVertexSmooth,
    nodeEditStraightenSegment,
    nodeEditJoinEndpoints,
    nodeEditDuplicateSelection,
    nodeEditNudgeSelected
  }
}
