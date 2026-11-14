import type { Editor } from '@pairdraw/core'
import {
  joinEndpoints,
  nearestPointOnNetwork,
  removeVertex,
  splitSegmentAt
} from '@pairdraw/core/vector'
import type { VectorNetwork } from '@pairdraw/scene-graph'

import { pushNodeEditHistory } from './history'
import type { NodeEditState, VectorEditState } from './types'

export function setNodeEditNetwork(es: NodeEditState, network: VectorNetwork) {
  es.vertices = network.vertices.map((v) => ({ ...v }))
  es.segments = network.segments.map((s) => ({
    ...s,
    tangentStart: { ...s.tangentStart },
    tangentEnd: { ...s.tangentEnd }
  }))
  es.regions = network.regions.map((r) => ({
    windingRule: r.windingRule,
    loops: r.loops.map((l) => [...l])
  }))
}

export function getLiveNetwork(es: NodeEditState): VectorNetwork {
  return {
    vertices: es.vertices.map((v) => ({ ...v })),
    segments: es.segments.map((s) => ({
      ...s,
      tangentStart: { ...s.tangentStart },
      tangentEnd: { ...s.tangentEnd }
    })),
    regions: es.regions.map((r) => ({
      windingRule: r.windingRule,
      loops: r.loops.map((l) => [...l])
    }))
  }
}

export function createVectorEditNetworkActions(
  editor: Editor,
  state: VectorEditState,
  getNodeEditState: () => NodeEditState | null
) {
  const nodeEditHitThreshold = 8

  /**
   * Merges end point `a` into end point `b`, as dropping a dragged end point on another does. It is
   * the same join as ⌘/Ctrl+J, so a path whose two ends meet closes and fills either way.
   */
  function nodeEditConnectEndpoints(a: number, b: number) {
    const es = getNodeEditState()
    if (!es) return
    const joined = joinEndpoints(getLiveNetwork(es), a, b, Infinity)
    if (!joined) return
    pushNodeEditHistory(es)
    setNodeEditNetwork(es, joined.network)
    es.selectedVertexIndices = new Set(joined.vertexIndices)
    es.selectedSegmentIndices = new Set()
    es.selectedRegions = new Set()
    es.selectedHandles = new Set()
    editor.requestRender()
  }

  /** Splits the segment under a canvas point; false when no segment is near enough. */
  function nodeEditAddVertex(cx: number, cy: number): boolean {
    const es = getNodeEditState()
    if (!es) return false
    const live = getLiveNetwork(es)
    const nearest = nearestPointOnNetwork(cx, cy, live, nodeEditHitThreshold / state.zoom)
    if (!nearest) return false
    pushNodeEditHistory(es)
    const split = splitSegmentAt(live, nearest.segmentIndex, nearest.t)
    setNodeEditNetwork(es, split.network)
    es.selectedVertexIndices = new Set([split.newVertexIndex])
    es.selectedSegmentIndices = new Set()
    es.selectedRegions = new Set()
    es.selectedHandles = new Set()
    editor.requestRender()
    return true
  }

  function nodeEditRemoveVertex(vertexIndex: number) {
    const es = getNodeEditState()
    if (!es) return
    const live = getLiveNetwork(es)
    const next = removeVertex(live, vertexIndex)
    if (!next) return
    pushNodeEditHistory(es)
    setNodeEditNetwork(es, next)
    es.selectedVertexIndices = new Set()
    es.selectedSegmentIndices = new Set()
    es.selectedRegions = new Set()
    es.selectedHandles = new Set()
    editor.requestRender()
  }

  return { nodeEditConnectEndpoints, nodeEditAddVertex, nodeEditRemoveVertex }
}
