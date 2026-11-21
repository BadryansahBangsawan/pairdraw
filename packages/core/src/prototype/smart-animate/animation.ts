import type { Fill, PrototypeEasingType, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { extractPageContext, findPageId } from '#core/io/subgraph'
import { easingAt } from '#core/prototype/easing'
import type { PlaySceneView } from '#core/prototype/scene'

import { matchLayers } from './match'

/** A top-level frame and the graph play reads it from: the document, or play's copy of it. */
export interface PlayFrame {
  graph: SceneGraph
  rootId: string
}

/**
 * A Smart animate from one frame to another, drawn as a view of the destination frame: a private
 * copy of it, which `seek` poses at a moment of the transition. The canvas draws `graph` in place
 * of `rootId` and redraws `touched` whenever `revision` grows; a recording draws it the same way.
 */
export interface SmartAnimation extends PlaySceneView {
  /** The destination frame, which the copy draws in its place. */
  readonly rootId: string
  /**
   * Poses the copy `progress` of the way through the transition's time, from 0 to 1, eased as the
   * transition asks. Writes only the layers that change.
   */
  seek(progress: number): void
}

/** The numbers Smart animate moves from one layer's value to its match's. */
const ANIMATED_FIELDS = [
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'opacity',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius'
] as const satisfies readonly (keyof SceneNode)[]

type AnimatedField = (typeof ANIMATED_FIELDS)[number]

/** One field moving from `from` to `to`. */
interface NumberTrack {
  field: AnimatedField
  from: number
  to: number
}

/** A layer of the copy and what moves on it: numbers, and solid fills whose colours blend. */
interface LayerTrack {
  id: string
  numbers: NumberTrack[]
  fills: { from: readonly Fill[]; to: readonly Fill[] } | null
}

/** A copy's own id for a layer of the start frame that fades out, which never names a real one. */
function leavingId(id: string): string {
  return `smart-animate:${id}`
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

/** Wraps an angle into (-180, 180], the range a layer's rotation keeps. */
function wrapAngle(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

function blend(from: Color, to: Color, amount: number): Color {
  return {
    r: lerp(from.r, to.r, amount),
    g: lerp(from.g, to.g, amount),
    b: lerp(from.b, to.b, amount),
    a: lerp(from.a, to.a, amount)
  }
}

/**
 * The fills to blend between two layers: lists of the same length whose fills are solid at the
 * same places. Others, and fills that do not differ, take the destination's at once.
 */
function fillTrack(from: readonly Fill[], to: readonly Fill[]): LayerTrack['fills'] {
  if (from.length !== to.length || from.length === 0) return null
  let differs = false
  for (const [index, fill] of to.entries()) {
    const start = from.at(index)
    if (start?.type !== 'SOLID' || fill.type !== 'SOLID') return null
    const { r, g, b, a } = start.color
    const end = fill.color
    if (
      r !== end.r ||
      g !== end.g ||
      b !== end.b ||
      a !== end.a ||
      start.opacity !== fill.opacity
    ) {
      differs = true
    }
  }
  return differs ? { from, to } : null
}

function blendFills(track: NonNullable<LayerTrack['fills']>, amount: number): Fill[] {
  return track.to.map((fill, index) => {
    const start = track.from.at(index)
    if (!start) return fill
    return {
      ...fill,
      color: blend(start.color, fill.color, amount),
      opacity: lerp(start.opacity, fill.opacity, amount)
    }
  })
}

/** What moves on a matched layer, or null when nothing does. Rotation turns the short way. */
function pairTrack(from: SceneNode, to: SceneNode, fields: readonly AnimatedField[]) {
  const numbers = fields.flatMap((field) => {
    const start = from[field]
    const end = to[field]
    if (start === end) return []
    // Rotation lives in (-180, 180]; across ±180 the short way is under half a turn.
    const delta = field === 'rotation' ? ((((end - start) % 360) + 540) % 360) - 180 : end - start
    return [{ field, from: start, to: start + delta }]
  })
  const fills = fillTrack(from.fills, to.fills)
  return numbers.length > 0 || fills ? { id: to.id, numbers, fills } : null
}

/**
 * Copies a start-frame layer that fades out, with all it holds, under `parentId` in the copy at
 * `index`, under ids of its own so it never shares a cached drawing with a real layer.
 */
function carryLeaving(
  from: SceneGraph,
  graph: SceneGraph,
  id: string,
  parentId: string,
  index: number
): string | null {
  const parent = graph.getNode(parentId)
  const source = from.getNode(id)
  if (!parent || !source) return null
  const copy = (node: SceneNode, copyParentId: string): string => {
    const cloned = structuredClone(node)
    cloned.id = leavingId(node.id)
    cloned.parentId = copyParentId
    cloned.childIds = node.childIds.flatMap((childId) => {
      const child = from.getNode(childId)
      return child ? [copy(child, cloned.id)] : []
    })
    graph.nodes.set(cloned.id, cloned)
    return cloned.id
  }
  const copied = copy(source, parent.id)
  const at = Math.min(index, parent.childIds.length)
  parent.childIds = [...parent.childIds.slice(0, at), copied, ...parent.childIds.slice(at)]
  return copied
}

/** A fade of one layer's opacity, or null for a layer already invisible. */
function fadeTrack(id: string, from: number, to: number): LayerTrack | null {
  return from === to ? null : { id, numbers: [{ field: 'opacity', from, to }], fills: null }
}

/**
 * What moves in `graph`, the copy of the destination frame `rootId`: its fill, the layers that
 * match the start frame's, the destination's layers that fade in, and the start frame's that fade
 * out, which this carries into the copy under the match of their parent.
 */
function animationTracks(from: PlayFrame, graph: SceneGraph, rootId: string): LayerTrack[] {
  const match = matchLayers(from.graph, from.rootId, graph, rootId)
  const tracks: LayerTrack[] = []
  const add = (track: LayerTrack | null) => {
    if (track) tracks.push(track)
  }
  const fromRoot = from.graph.getNode(from.rootId)
  const toRoot = graph.getNode(rootId)
  if (fromRoot && toRoot) add(pairTrack(fromRoot, toRoot, []))
  const matchOf = new Map<string, string>([[from.rootId, rootId]])
  for (const pair of match.pairs) {
    matchOf.set(pair.from, pair.to)
    const start = from.graph.getNode(pair.from)
    const end = graph.getNode(pair.to)
    if (start && end) add(pairTrack(start, end, ANIMATED_FIELDS))
  }
  // A layer hidden at an end draws nothing there, so it needs no fade: one hidden in both frames
  // costs nothing at all, and one hidden at the far end only fades at the end that shows it.
  for (const id of match.entering) {
    const node = graph.getNode(id)
    if (node?.visible) add(fadeTrack(id, 0, node.opacity))
  }
  for (const id of match.leaving) {
    const node = from.graph.getNode(id)
    if (!node?.visible) continue
    const parentId = node.parentId ? matchOf.get(node.parentId) : undefined
    if (!node.parentId || !parentId) continue
    const index = from.graph.getNode(node.parentId)?.childIds.indexOf(id) ?? 0
    const copied = carryLeaving(from.graph, graph, id, parentId, index)
    if (copied) add(fadeTrack(copied, node.opacity, 0))
  }
  graph.clearAbsPosCache()
  return tracks
}

/**
 * A Smart animate from `from` to `to`: a copy of the destination frame in which each layer that
 * matches one of the start frame (`matchLayers`) moves from the start layer's position, size,
 * rotation, opacity, corner radius and solid fill colours to its own, the start frame's layers
 * with no match fade out where they were, and the destination's fade in. The destination frame
 * keeps its place and size and blends its fill. Neither frame changes. Matching and the copy cost
 * one pass when it is made; a step writes only the layers that change.
 */
export function createSmartAnimation(
  from: PlayFrame,
  to: PlayFrame,
  easing?: PrototypeEasingType
): SmartAnimation {
  const pageId = findPageId(to.graph, to.rootId) ?? to.graph.rootId
  const graph = extractPageContext(to.graph, pageId, [to.rootId], { shareTables: true })
  const tracks = animationTracks(from, graph, to.rootId)

  // A layer's cached drawing holds what it contains, so its frame and the layers between redraw.
  const touched = new Set<string>()
  for (const track of tracks) {
    graph.closest(track.id, (node) => {
      touched.add(node.id)
      return node.id === to.rootId
    })
  }

  function pose(progress: number): void {
    const amount = easingAt(easing, progress)
    for (const track of tracks) {
      const changes: Partial<SceneNode> = {}
      for (const { field, from: start, to: end } of track.numbers) {
        const value = lerp(start, end, amount)
        changes[field] = field === 'rotation' ? wrapAngle(value) : value
      }
      if (track.fills) changes.fills = blendFills(track.fills, amount)
      graph.updateNode(track.id, changes)
    }
  }

  // Made at its start, so the first drawing shows the start frame's layout.
  pose(0)
  let revision = 0
  return {
    graph,
    rootId: to.rootId,
    touched,
    get revision() {
      return revision
    },
    seek(progress) {
      pose(progress)
      revision += 1
    }
  }
}
