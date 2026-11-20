import type { ArcData, VectorNetwork } from '@pairdraw/scene-graph'
import { parseSVGPath } from '@pairdraw/scene-graph/parse-path'

import type { PenNode } from './schema'
import { resolveNumber, type VarContext } from './variables'

const DEGREES = Math.PI / 180

/**
 * An ellipse's arc. pen.dev measures `startAngle` counter-clockwise from the right and sweeps
 * counter-clockwise for a positive `sweepAngle`; the scene graph measures clockwise.
 */
export function ellipseArc(pen: PenNode, ctx: VarContext): ArcData | null {
  if (pen.innerRadius === undefined && pen.startAngle === undefined && pen.sweepAngle === undefined)
    return null
  const start = resolveNumber(pen.startAngle, ctx)
  const sweep = Math.max(-360, Math.min(360, resolveNumber(pen.sweepAngle, ctx, 360)))
  return {
    startingAngle: -start * DEGREES,
    endingAngle: -(start + sweep) * DEGREES,
    innerRadius: Math.max(0, Math.min(1, resolveNumber(pen.innerRadius, ctx)))
  }
}

type ViewBox = [x: number, y: number, width: number, height: number]

function networkBounds(network: VectorNetwork): ViewBox {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const { x, y } of network.vertices) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return [minX, minY, maxX - minX, maxY - minY]
}

/**
 * A path's geometry in its box. `viewBox` is the region of the path's coordinates that fills the
 * box; without one, the geometry's own bounds do. An axis the geometry has no extent on is not
 * scaled, so a straight line keeps its place.
 */
export function pathNetwork(pen: PenNode, width: number, height: number): VectorNetwork | null {
  if (!pen.geometry) return null
  const network = parseSVGPath(pen.geometry, pen.fillRule === 'evenodd' ? 'EVENODD' : 'NONZERO')
  if (network.vertices.length === 0) return network
  const [vx, vy, vw, vh] = pen.viewBox ?? networkBounds(network)
  const sx = vw > 0 ? width / vw : 1
  const sy = vh > 0 ? height / vh : 1
  for (const vertex of network.vertices) {
    vertex.x = (vertex.x - vx) * sx
    vertex.y = (vertex.y - vy) * sy
  }
  for (const segment of network.segments) {
    segment.tangentStart = { x: segment.tangentStart.x * sx, y: segment.tangentStart.y * sy }
    segment.tangentEnd = { x: segment.tangentEnd.x * sx, y: segment.tangentEnd.y * sy }
  }
  return network
}

/** A `line`'s geometry: from its box's top-left corner to its bottom-right, as pen.dev draws it. */
export function lineNetwork(width: number, height: number): VectorNetwork {
  return {
    vertices: [
      { x: 0, y: 0 },
      { x: width, y: height }
    ],
    segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
    regions: []
  }
}

function pathNumber(value: number): string {
  return String(Object.is(value, -0) ? 0 : value)
}

function directedSegment(
  network: VectorNetwork,
  index: number,
  forward: boolean
): { command: string; end: number } {
  const segment = network.segments[index]
  const from = forward ? segment.start : segment.end
  const to = forward ? segment.end : segment.start
  const start = network.vertices[from]
  const end = network.vertices[to]
  const tangentStart = forward ? segment.tangentStart : segment.tangentEnd
  const tangentEnd = forward ? segment.tangentEnd : segment.tangentStart
  if (tangentStart.x === 0 && tangentStart.y === 0 && tangentEnd.x === 0 && tangentEnd.y === 0) {
    return { command: `L${pathNumber(end.x)} ${pathNumber(end.y)}`, end: to }
  }
  return {
    command: `C${pathNumber(start.x + tangentStart.x)} ${pathNumber(
      start.y + tangentStart.y
    )} ${pathNumber(end.x + tangentEnd.x)} ${pathNumber(end.y + tangentEnd.y)} ${pathNumber(
      end.x
    )} ${pathNumber(end.y)}`,
    end: to
  }
}

/**
 * A vector network as SVG path data, the form pen keeps a path in (`geometry`). Region loops are
 * closed subpaths; the segments outside them are walked as open chains so joins stay joins.
 */
export function networkToSVGPath(network: VectorNetwork): string {
  const parts: string[] = []
  const inRegion = new Set<number>()
  for (const region of network.regions) {
    for (const loop of region.loops) {
      if (loop.length === 0) continue
      const first = network.segments[loop[0]]
      let current: number
      if (loop.length === 1) current = first.start
      else {
        const second = network.segments[loop[1]]
        current = first.end === second.start || first.end === second.end ? first.start : first.end
      }
      const startVertex = network.vertices[current]
      parts.push(`M${pathNumber(startVertex.x)} ${pathNumber(startVertex.y)}`)
      for (const index of loop) {
        const segment = network.segments[index]
        const forward = segment.start === current
        const drawn = directedSegment(network, index, forward)
        parts.push(drawn.command)
        current = drawn.end
        inRegion.add(index)
      }
      parts.push('Z')
    }
  }
  const used = new Set<number>(inRegion)
  const degree = new Map<number, number[]>()
  for (const [index, segment] of network.segments.entries()) {
    if (inRegion.has(index)) continue
    for (const vertex of [segment.start, segment.end]) {
      const list = degree.get(vertex) ?? []
      list.push(index)
      degree.set(vertex, list)
    }
  }
  let current: number
  for (;;) {
    const unused = [...degree.entries()].filter(([, indexes]) =>
      indexes.some((index) => !used.has(index))
    )
    if (unused.length === 0) break
    const start = (unused.find(([, indexes]) => indexes.length === 1) ?? unused[0])[0]
    const vertex = network.vertices[start]
    parts.push(`M${pathNumber(vertex.x)} ${pathNumber(vertex.y)}`)
    current = start
    for (;;) {
      const next = (degree.get(current) ?? []).find((index) => !used.has(index))
      if (next === undefined) break
      const segment = network.segments[next]
      used.add(next)
      const drawn = directedSegment(network, next, segment.start === current)
      parts.push(drawn.command)
      current = drawn.end
    }
  }
  return parts.join('')
}
