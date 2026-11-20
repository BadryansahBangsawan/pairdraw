import * as v from 'valibot'

import type { SceneGraph } from '@pairdraw/scene-graph'
import { getAxisAlignedBoundsInParent } from '@pairdraw/scene-graph/coordinate'
import { computeBounds } from '@pairdraw/scene-graph/geometry'
import type { Rect } from '@pairdraw/scene-graph/primitives'

import { flushPendingLayout } from '#core/figma-api'
import { findPageId } from '#core/io/subgraph'
import { defineTool, toolNumber } from '#core/tools/schema'

const SPACE_DIRECTIONS = ['right', 'below', 'left', 'above'] as const
type SpaceDirection = (typeof SPACE_DIRECTIONS)[number]

/** Room kept between a found space and the layers around it, as `import_mermaid` keeps. */
export const DEFAULT_SPACE_GAP = 100

export interface EmptySpaceRequest {
  /** What is already there, in the parent's coordinates. */
  obstacles: readonly Rect[]
  width: number
  height: number
  /** The region to stay close to; null when the parent is empty. */
  anchor: Rect | null
  gap: number
  directions: readonly SpaceDirection[]
}

export interface EmptySpace extends Rect {
  direction: SpaceDirection | null
}

/** Whether `rect` comes within `gap` of `obstacle`, or covers part of it when `gap` is 0. */
export function rectsOverlap(rect: Rect, obstacle: Rect, gap: number): boolean {
  return (
    rect.x < obstacle.x + obstacle.width + gap &&
    rect.x + rect.width + gap > obstacle.x &&
    rect.y < obstacle.y + obstacle.height + gap &&
    rect.y + rect.height + gap > obstacle.y
  )
}

/**
 * The first free position going one way from the anchor, keeping the anchor's row or column.
 * Each candidate sits just past an obstacle's far edge, so the last one clears them all.
 */
function spaceToward(request: EmptySpaceRequest, anchor: Rect, direction: SpaceDirection): Rect {
  const { obstacles, width, height, gap } = request
  const horizontal = direction === 'right' || direction === 'left'
  const forward = direction === 'right' || direction === 'below'
  const start = {
    right: anchor.x + anchor.width + gap,
    left: anchor.x - gap - width,
    below: anchor.y + anchor.height + gap,
    above: anchor.y - gap - height
  }[direction]
  const edges = obstacles.map((obstacle) => {
    if (direction === 'right') return obstacle.x + obstacle.width + gap
    if (direction === 'left') return obstacle.x - gap - width
    if (direction === 'below') return obstacle.y + obstacle.height + gap
    return obstacle.y - gap - height
  })
  const candidates = [start, ...edges.filter((edge) => (forward ? edge > start : edge < start))]
  candidates.sort((a, b) => (forward ? a - b : b - a))
  const place = (offset: number): Rect =>
    horizontal
      ? { x: offset, y: anchor.y, width, height }
      : { x: anchor.x, y: offset, width, height }
  for (const offset of candidates) {
    const rect = place(offset)
    if (!obstacles.some((obstacle) => rectsOverlap(rect, obstacle, gap))) return rect
  }
  // Unreachable: the farthest candidate clears every obstacle along this axis.
  return place(candidates[candidates.length - 1] ?? start)
}

function distance(anchor: Rect, rect: Rect, direction: SpaceDirection, gap: number): number {
  if (direction === 'right') return rect.x - (anchor.x + anchor.width + gap)
  if (direction === 'left') return anchor.x - gap - (rect.x + rect.width)
  if (direction === 'below') return rect.y - (anchor.y + anchor.height + gap)
  return anchor.y - gap - (rect.y + rect.height)
}

/**
 * A free region of `width` × `height` that keeps `gap` from every obstacle, as close to the
 * anchor as the directions allow; the first direction wins a tie.
 */
export function findEmptySpace(request: EmptySpaceRequest): EmptySpace {
  const { anchor, width, height, gap } = request
  if (!anchor) return { x: 0, y: 0, width, height, direction: null }
  let best: { rect: Rect; direction: SpaceDirection; distance: number } | null = null
  for (const direction of request.directions) {
    const rect = spaceToward(request, anchor, direction)
    const away = distance(anchor, rect, direction, gap)
    if (!best || away < best.distance) best = { rect, direction, distance: away }
  }
  return best
    ? { ...best.rect, direction: best.direction }
    : { ...spaceToward(request, anchor, 'right'), direction: 'right' }
}

/** Each child of `parentId` as an axis-aligned box in the parent's coordinates. */
export function childBoxes(graph: SceneGraph, parentId: string): Rect[] {
  const parent = graph.getNode(parentId)
  if (!parent) return []
  return parent.childIds.flatMap((id) => {
    const node = graph.getNode(id)
    return node ? [getAxisAlignedBoundsInParent([node], parentId, graph)] : []
  })
}

/** Where content of a size goes beside what `parentId` already holds. */
export function spaceBesideContent(
  graph: SceneGraph,
  parentId: string,
  size: { width: number; height: number },
  gap = DEFAULT_SPACE_GAP
): EmptySpace {
  const obstacles = childBoxes(graph, parentId)
  return findEmptySpace({
    obstacles,
    ...size,
    anchor: obstacles.length > 0 ? computeBounds(obstacles) : null,
    gap,
    directions: ['right']
  })
}

const sizeInput = (description: string) =>
  toolNumber(v.pipe(v.number(), v.minValue(0), v.description(description)))

export const findEmptySpaceTool = defineTool({
  name: 'find_empty_space',
  description:
    'Find a free region of the canvas for new content of a given size, so it overlaps nothing. Without near_id it looks beside everything the parent holds; with near_id it looks next to that layer. direction "any" (default) takes the nearest free spot to the right, below, left, or above. Returns x and y in the parent’s coordinates, ready for render or create tools.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    width: sizeInput('Width of the content to place'),
    height: sizeInput('Height of the content to place'),
    near_id: v.optional(
      v.pipe(v.string(), v.description('Layer to place the content next to (default: all content)'))
    ),
    parent_id: v.optional(
      v.pipe(v.string(), v.description('Parent to search (default: the current page)'))
    ),
    direction: v.optional(
      v.pipe(
        v.picklist(['any', ...SPACE_DIRECTIONS]),
        v.description('Which side of the anchor to search (default: any)')
      ),
      'any'
    ),
    gap: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(0),
          v.description(`Room to keep around other layers (default: ${DEFAULT_SPACE_GAP})`)
        )
      ),
      DEFAULT_SPACE_GAP
    )
  }),
  execute: (figma, args) => {
    const graph = figma.graph
    const nearParentId = args.near_id ? graph.getNode(args.near_id)?.parentId : undefined
    if (args.near_id && !nearParentId) return { error: `Node "${args.near_id}" not found` }
    const parentId = args.parent_id ?? nearParentId ?? figma.currentPage.id
    const parent = graph.getNode(parentId)
    if (!parent || (parent.type !== 'CANVAS' && !findPageId(graph, parentId))) {
      return { error: `Parent "${parentId}" not found` }
    }
    if (parent.layoutMode !== 'NONE' && parent.type !== 'CANVAS') {
      return { error: `${parent.name} places its children with auto layout; append to it instead` }
    }
    if (args.near_id && nearParentId !== parentId) {
      return { error: `Node "${args.near_id}" is not a child of "${parentId}"` }
    }
    flushPendingLayout(graph)
    const obstacles = childBoxes(graph, parentId)
    const near = args.near_id ? graph.getNode(args.near_id) : undefined
    let anchor = obstacles.length > 0 ? computeBounds(obstacles) : null
    if (near) anchor = getAxisAlignedBoundsInParent([near], parentId, graph)
    const space = findEmptySpace({
      obstacles,
      width: args.width,
      height: args.height,
      anchor,
      gap: args.gap,
      directions: args.direction === 'any' ? SPACE_DIRECTIONS : [args.direction]
    })
    // Whole pixels, rounded away from what the space was found beside.
    const round = (value: number, away: SpaceDirection) =>
      space.direction === away ? Math.floor(value) : Math.ceil(value)
    return {
      parent_id: parentId,
      x: round(space.x, 'left'),
      y: round(space.y, 'above'),
      width: args.width,
      height: args.height,
      ...(space.direction ? { direction: space.direction } : {})
    }
  }
})
