import { clamp } from 'es-toolkit'

import type { HandleMirroring, VectorNetwork } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { cloneVectorNetwork } from '@open-pencil/scene-graph/vector-network'

import { findOppositeHandle, mirrorHandle } from './bezier'

/**
 * How far along a segment, as a share of it, a bend pulls at most toward either end. Near an end
 * the curve barely moves with its handles, so a press there bends as if it were this far in.
 */
const BEND_T_MARGIN = 0.15
/** Handles within this angle of pointing opposite ways make a point smooth, mirrored or not. */
const SMOOTH_COSINE = Math.cos((179 * Math.PI) / 180)

export interface BendSegmentOptions {
  /**
   * Leave the handles of the neighbouring segments where they are, as ⌘/Ctrl+⌥/Alt dragging does
   * in Figma. The segment's points then become corners. Otherwise a smooth point stays smooth and
   * its other handle turns with the bent one.
   */
  keepNeighbours?: boolean
}

function isZero(v: Vector) {
  return Math.abs(v.x) < 1e-9 && Math.abs(v.y) < 1e-9
}

/**
 * How a point mirrors its handles for a bend: its own setting, or `ANGLE` when it sets none but its
 * two handles already point opposite ways, as smooth points read from SVG do.
 */
function bendMirroring(
  network: VectorNetwork,
  vertexIndex: number,
  segmentIndex: number,
  own: Vector
): HandleMirroring {
  const mode = network.vertices[vertexIndex].handleMirroring ?? 'NONE'
  if (mode !== 'NONE') return mode
  const opposite = findOppositeHandle(network, vertexIndex, segmentIndex)
  if (!opposite) return 'NONE'
  const other = network.segments[opposite.segmentIndex][opposite.tangentField]
  const lengths = Math.hypot(own.x, own.y) * Math.hypot(other.x, other.y)
  if (lengths < 1e-9) return 'NONE'
  return (own.x * other.x + own.y * other.y) / lengths <= SMOOTH_COSINE ? 'ANGLE' : 'NONE'
}

/**
 * Bends a segment so the point at `t` along it moves by `delta`, as ⌘/Ctrl dragging a segment does
 * in Figma: its two handles move by the least that carries the curve through the dragged point, so
 * a straight segment bowed from its middle bends into an even arc. `network` is the path as the
 * drag found it, so each move bends from there. The segment's end points stay put.
 */
export function bendSegment(
  network: VectorNetwork,
  segmentIndex: number,
  t: number,
  delta: Vector,
  options: BendSegmentOptions = {}
): VectorNetwork {
  const segment = network.segments.at(segmentIndex)
  if (!segment) return network
  const at = clamp(t, BEND_T_MARGIN, 1 - BEND_T_MARGIN)
  // The weights of the two inner control points in the Bernstein form of the cubic at `at`.
  const startWeight = 3 * (1 - at) * (1 - at) * at
  const endWeight = 3 * (1 - at) * at * at
  const norm = startWeight * startWeight + endWeight * endWeight

  const next = cloneVectorNetwork(network)
  const bent = next.segments[segmentIndex]
  bent.tangentStart = {
    x: segment.tangentStart.x + (delta.x * startWeight) / norm,
    y: segment.tangentStart.y + (delta.y * startWeight) / norm
  }
  bent.tangentEnd = {
    x: segment.tangentEnd.x + (delta.x * endWeight) / norm,
    y: segment.tangentEnd.y + (delta.y * endWeight) / norm
  }

  const ends = [
    [segment.start, 'tangentStart'],
    [segment.end, 'tangentEnd']
  ] as const
  for (const [vertexIndex, field] of ends) {
    const mode = bendMirroring(network, vertexIndex, segmentIndex, segment[field])
    if (mode === 'NONE') continue
    const opposite = findOppositeHandle(network, vertexIndex, segmentIndex)
    if (!opposite) continue
    if (options.keepNeighbours) {
      next.vertices[vertexIndex] = { ...next.vertices[vertexIndex], handleMirroring: 'NONE' }
      continue
    }
    const applied = bent[field]
    if (isZero(applied)) continue
    const current = network.segments[opposite.segmentIndex][opposite.tangentField]
    const mirrored = mirrorHandle(
      applied,
      mode,
      mode === 'ANGLE' ? Math.hypot(current.x, current.y) : undefined
    )
    if (mirrored) next.segments[opposite.segmentIndex][opposite.tangentField] = mirrored
  }
  return next
}
