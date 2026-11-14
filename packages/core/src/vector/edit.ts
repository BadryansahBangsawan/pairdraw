import type {
  VectorNetwork,
  VectorRegion,
  VectorSegment,
  VectorVertex
} from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'
import { cloneVectorNetwork } from '@pairdraw/scene-graph/vector-network'

import { splitSegmentAt } from './bezier'

/** A network after an edit, with the points the edit leaves selected. */
export interface VectorEditResult {
  network: VectorNetwork
  vertexIndices: number[]
}

/** A fresh zero handle, never shared between segments. */
const zero = (): Vector => ({ x: 0, y: 0 })
/** How close to an end of a segment, as a share of it, a cut lands on that end's point. */
const CUT_END_T = 1e-4

function isZero(v: Vector) {
  return Math.abs(v.x) < 1e-9 && Math.abs(v.y) < 1e-9
}

function incidentSegments(network: VectorNetwork, vertexIndex: number): number[] {
  return network.segments.flatMap((segment, index) =>
    segment.start === vertexIndex || segment.end === vertexIndex ? [index] : []
  )
}

function otherEnd(segment: VectorSegment, vertexIndex: number) {
  return segment.start === vertexIndex ? segment.end : segment.start
}

function tangentFieldAt(segment: VectorSegment, vertexIndex: number) {
  return segment.start === vertexIndex ? 'tangentStart' : 'tangentEnd'
}

/** Drops the loops that run through any of `segments`, and regions left without a loop. */
function dropLoopsThrough(regions: VectorRegion[], segments: Set<number>): VectorRegion[] {
  return regions.flatMap((region) => {
    const loops = region.loops.filter((loop) => !loop.some((index) => segments.has(index)))
    return loops.length > 0 ? [{ ...region, loops }] : []
  })
}

/**
 * Cuts the path at a point, as Figma's cut tool does: every segment there but the first moves onto
 * its own copy of the point and keeps its handles, so the curves keep their shape. Loops through
 * the point open, so they stop filling. A point with one segment or none has nothing to cut.
 */
export function cutAtVertex(network: VectorNetwork, vertexIndex: number): VectorEditResult {
  const incident = incidentSegments(network, vertexIndex)
  if (incident.length < 2) return { network, vertexIndices: [vertexIndex] }

  const next = cloneVectorNetwork(network)
  const vertexIndices = [vertexIndex]
  next.vertices[vertexIndex] = { ...next.vertices[vertexIndex], handleMirroring: 'NONE' }
  for (const segmentIndex of incident.slice(1)) {
    const copy = next.vertices.push({ ...next.vertices[vertexIndex] }) - 1
    vertexIndices.push(copy)
    const segment = next.segments[segmentIndex]
    if (segment.start === vertexIndex) segment.start = copy
    else segment.end = copy
  }
  next.regions = dropLoopsThrough(next.regions, new Set(incident))
  return { network: next, vertexIndices }
}

/**
 * Breaks the path at a point (⌥/Alt+Delete) the way the cut tool does, returning only the network.
 * Breaking and cutting are one edit, so both keep the curves and the fills the break leaves closed.
 */
export function breakAtVertex(network: VectorNetwork, vertexIndex: number): VectorNetwork {
  return cutAtVertex(network, vertexIndex).network
}

/**
 * Cuts a segment at `t` (0–1 along it): the segment is split there and the path is cut at the new
 * point, leaving two end points in the same place. A cut at either end cuts at that end's point.
 */
export function cutSegmentAt(
  network: VectorNetwork,
  segmentIndex: number,
  t: number
): VectorEditResult {
  const segment = network.segments.at(segmentIndex)
  if (!segment) return { network, vertexIndices: [] }
  if (t <= CUT_END_T) return cutAtVertex(network, segment.start)
  if (t >= 1 - CUT_END_T) return cutAtVertex(network, segment.end)
  const split = splitSegmentAt(network, segmentIndex, t)
  return cutAtVertex(split.network, split.newVertexIndex)
}

/**
 * The segments of the open chain that starts at end point `from`, in order, up to end point `to`;
 * null when `to` is not at the other end of that chain or the chain branches on the way.
 */
function chainBetween(network: VectorNetwork, from: number, to: number): number[] | null {
  const walked: number[] = []
  let vertex = from
  let previous = -1
  for (let step = 0; step <= network.segments.length; step++) {
    if (vertex === to && walked.length > 0) return walked
    const incident = incidentSegments(network, vertex)
    if (incident.length !== (vertex === from ? 1 : 2)) return null
    const segmentIndex = incident[0] === previous ? incident[1] : incident[0]
    walked.push(segmentIndex)
    previous = segmentIndex
    vertex = otherEnd(network.segments[segmentIndex], vertex)
  }
  return null
}

/**
 * Joins end point `a` to end point `b`, as a join command does in vector editors and as dropping a
 * dragged end point on another does. Points closer than `tolerance` become one point where `b` is
 * (an infinite tolerance always merges them); points further apart get a straight segment.
 * Joining the two ends of one open path closes it, and the closed path fills, as closing it with
 * the pen does. Null when either point is not an end point (it has more than one segment).
 */
export function joinEndpoints(
  network: VectorNetwork,
  a: number,
  b: number,
  tolerance = 0
): VectorEditResult | null {
  if (a === b || a < 0 || b < 0) return null
  const va = network.vertices.at(a)
  const vb = network.vertices.at(b)
  if (!va || !vb) return null
  if (incidentSegments(network, a).length > 1 || incidentSegments(network, b).length > 1) {
    return null
  }

  const chain = chainBetween(network, b, a)
  const next = cloneVectorNetwork(network)

  if (Math.hypot(va.x - vb.x, va.y - vb.y) > tolerance) {
    const joined =
      next.segments.push({ start: a, end: b, tangentStart: zero(), tangentEnd: zero() }) - 1
    if (chain) next.regions.push({ windingRule: 'NONZERO', loops: [[...chain, joined]] })
    return { network: next, vertexIndices: [a, b] }
  }

  // A single segment whose two ends meet would shrink to nothing.
  if (chain?.length === 1) return null
  const merged: VectorVertex = { ...vb, handleMirroring: 'NONE' }
  const remap = (index: number) => {
    const target = index === a ? b : index
    return target > a ? target - 1 : target
  }
  next.vertices = next.vertices.flatMap((vertex, index) => {
    if (index === a) return []
    return [index === b ? merged : vertex]
  })
  for (const segment of next.segments) {
    segment.start = remap(segment.start)
    segment.end = remap(segment.end)
  }
  if (chain) next.regions.push({ windingRule: 'NONZERO', loops: [chain] })
  return { network: next, vertexIndices: [remap(b)] }
}

/** A network with the parts it copied, as maps from each original index to its copy's. */
export interface VectorDuplicateResult {
  network: VectorNetwork
  vertices: Map<number, number>
  segments: Map<number, number>
  regions: Map<number, number>
}

/**
 * Copies points with the segments between them, plus `segmentIndices` and their points, and the
 * regions whose loops are all copied. The copies stand apart from the originals, except a point
 * copied without any of its segments, whose copy is joined to it by a straight segment, so that it
 * draws and extends the path from there.
 */
export function duplicateVectorParts(
  network: VectorNetwork,
  vertexIndices: Iterable<number>,
  segmentIndices: Iterable<number> = []
): VectorDuplicateResult {
  const next = cloneVectorNetwork(network)
  const pickedSegments = new Set(segmentIndices)
  const points = new Set(vertexIndices)
  for (const index of pickedSegments) {
    const segment = network.segments.at(index)
    if (!segment) continue
    points.add(segment.start)
    points.add(segment.end)
  }

  const vertices = new Map<number, number>()
  for (const index of [...points].sort((x, y) => x - y)) {
    const vertex = network.vertices.at(index)
    if (vertex) vertices.set(index, next.vertices.push({ ...vertex }) - 1)
  }

  const segments = new Map<number, number>()
  for (const [index, segment] of network.segments.entries()) {
    const start = vertices.get(segment.start)
    const end = vertices.get(segment.end)
    if (start === undefined || end === undefined) continue
    segments.set(
      index,
      next.segments.push({
        ...segment,
        start,
        end,
        tangentStart: { ...segment.tangentStart },
        tangentEnd: { ...segment.tangentEnd }
      }) - 1
    )
  }

  const copiedPoints = new Set<number>()
  for (const index of segments.keys()) {
    const segment = network.segments[index]
    copiedPoints.add(segment.start)
    copiedPoints.add(segment.end)
  }
  for (const [original, copy] of vertices) {
    if (copiedPoints.has(original)) continue
    next.segments.push({ start: original, end: copy, tangentStart: zero(), tangentEnd: zero() })
  }

  const regions = new Map<number, number>()
  for (const [index, region] of network.regions.entries()) {
    const loops = region.loops.map((loop) => loop.map((segment) => segments.get(segment)))
    if (!loops.every((loop) => loop.every((segment) => segment !== undefined))) continue
    regions.set(
      index,
      next.regions.push({
        ...region,
        loops
      }) - 1
    )
  }

  return { network: next, vertices, segments, regions }
}

/** Removes a segment's handles so it runs straight between its points. */
export function straightenSegment(network: VectorNetwork, segmentIndex: number): VectorNetwork {
  const segment = network.segments.at(segmentIndex)
  if (!segment || (isZero(segment.tangentStart) && isZero(segment.tangentEnd))) return network
  const next = cloneVectorNetwork(network)
  next.segments[segmentIndex] = { ...segment, tangentStart: zero(), tangentEnd: zero() }
  // The handles left on the other side no longer have a partner to mirror.
  for (const index of [segment.start, segment.end]) {
    next.vertices[index] = { ...next.vertices[index], handleMirroring: 'NONE' }
  }
  return next
}

/** Whether any segment leaves a point with a handle, which makes it a smooth point. */
export function isSmoothVertex(network: VectorNetwork, vertexIndex: number): boolean {
  return incidentSegments(network, vertexIndex).some(
    (index) =>
      !isZero(network.segments[index][tangentFieldAt(network.segments[index], vertexIndex)])
  )
}

/**
 * Switches a point between smooth and corner, as double-clicking it does in Figma. A smooth point
 * loses its handles. A corner between two segments gets handles parallel to the line through its
 * neighbours, a third of the way to each, with mirrored angles; an end point gets one handle toward
 * its neighbour. A point where more than two segments meet only becomes a corner.
 */
export function toggleVertexSmooth(network: VectorNetwork, vertexIndex: number): VectorNetwork {
  const vertex = network.vertices.at(vertexIndex)
  if (!vertex) return network
  const incident = incidentSegments(network, vertexIndex)
  const next = cloneVectorNetwork(network)

  if (isSmoothVertex(network, vertexIndex)) {
    for (const index of incident) {
      next.segments[index][tangentFieldAt(next.segments[index], vertexIndex)] = zero()
    }
    next.vertices[vertexIndex] = { ...vertex, handleMirroring: 'NONE' }
    return next
  }

  const neighbours = incident.map((index) => {
    const neighbour = network.vertices[otherEnd(network.segments[index], vertexIndex)]
    return { index, neighbour, length: Math.hypot(neighbour.x - vertex.x, neighbour.y - vertex.y) }
  })

  if (neighbours.length === 1) {
    const [{ index, neighbour }] = neighbours
    next.segments[index][tangentFieldAt(next.segments[index], vertexIndex)] = {
      x: (neighbour.x - vertex.x) / 3,
      y: (neighbour.y - vertex.y) / 3
    }
    return next
  }
  if (neighbours.length !== 2) return network

  const [before, after] = neighbours
  const span = {
    x: after.neighbour.x - before.neighbour.x,
    y: after.neighbour.y - before.neighbour.y
  }
  const spanLength = Math.hypot(span.x, span.y)
  if (spanLength < 1e-9) return network
  const direction = { x: span.x / spanLength, y: span.y / spanLength }
  for (const [side, { index, length }] of [
    [-1, before],
    [1, after]
  ] as const) {
    next.segments[index][tangentFieldAt(next.segments[index], vertexIndex)] = {
      x: (side * direction.x * length) / 3,
      y: (side * direction.y * length) / 3
    }
  }
  next.vertices[vertexIndex] = { ...vertex, handleMirroring: 'ANGLE' }
  return next
}
