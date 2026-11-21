import type { SceneNode } from '@pairdraw/scene-graph'
import {
  createSticky,
  DEFAULT_STICKY_COLOR,
  STICKY_COLORS,
  STICKY_SIZE,
  STICKY_WIDE_WIDTH,
  stickyScale,
  stickySublayers,
  stickyWidth
} from '@pairdraw/scene-graph/generated'
import { recordInstanceOverride } from '@pairdraw/scene-graph/instances'
import { fillSizingFields } from '@pairdraw/scene-graph/layout'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { parseSize } from './layout'
import type { Build } from './nodes'
import { applyPenPluginData } from './plugin-data'
import type { PenNode } from './schema'
import { bindIfVar, resolveBoolean, resolveNumber } from './variables'

/**
 * pen.dev's text annotations: a `note`, a `prompt` for an agent, and a `context` note about the
 * layers around it. Each becomes a sticky note holding its text, in the colour nearest the one
 * pen.dev draws its card in; a prompt and a context note keep what they were as plugin data.
 */
const ANNOTATION_COLORS: Readonly<Record<string, Color>> = {
  note: STICKY_COLORS.yellow,
  prompt: STICKY_COLORS.blue,
  context: STICKY_COLORS.gray
}

/** The annotation type names, which the reader knows even though they map to stickies. */
export const ANNOTATION_TYPES: readonly string[] = Object.keys(ANNOTATION_COLORS)

export function isAnnotation(pen: Pick<PenNode, 'type'>): boolean {
  return Object.hasOwn(ANNOTATION_COLORS, pen.type)
}

/** pen.dev cards smaller or larger than this stay readable as sticky notes at its bounds. */
const MIN_SCALE = 0.25
const MAX_SCALE = 4

/**
 * The note's shape and scale: wide when the card is nearer FigJam's wide width than its square
 * one, and its text scaled to the card's width. The card's box itself comes from `applyAnnotation`.
 */
function stickyShape(pen: PenNode, build: Build): { wide: boolean; scale: number } {
  const { value, sizing } = parseSize(pen.width, STICKY_SIZE, build.ctx)
  const width = sizing === 'FIXED' && value > 0 ? value : STICKY_SIZE
  const wide = width > (STICKY_SIZE + STICKY_WIDE_WIDTH) / 2
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, width / stickyWidth(1, wide)))
  return { wide, scale }
}

/**
 * The sticky's size fields, so it takes the room in a layout pen.dev's card does: a fixed width
 * and height keep the card's box, filling follows its parent's flow, and a card with no height or
 * one that fits its content grows to its text as a sticky does.
 */
function annotationSizeFields(
  node: SceneNode,
  pen: PenNode,
  build: Build,
  flowLayout: SceneNode['layoutMode']
): Partial<SceneNode> {
  const width = parseSize(pen.width, node.width, build.ctx)
  const height = parseSize(pen.height, node.height, build.ctx)
  const fixedHeight = pen.height !== undefined && height.sizing !== 'HUG'
  const fields: Partial<SceneNode> = {
    width: width.sizing === 'HUG' ? node.width : width.value,
    height: fixedHeight ? height.value : node.height,
    primaryAxisSizing: fixedHeight ? 'FIXED' : 'HUG',
    minHeight: fixedHeight
      ? null
      : (height.fitContentFallback ??
        STICKY_SIZE * stickyScale(stickySublayers(build.graph, node)?.author)),
    layoutGrow: 0,
    layoutAlignSelf: 'AUTO'
  }
  if (flowLayout === 'NONE') return fields
  if (width.sizing === 'FILL') Object.assign(fields, fillSizingFields(flowLayout, 'HORIZONTAL'))
  if (height.sizing === 'FILL') Object.assign(fields, fillSizingFields(flowLayout, 'VERTICAL'))
  return fields
}

/** A sticky note for an annotation, with its sublayers; its fields come from `applyAnnotation`. */
export function createAnnotation(pen: PenNode, parentId: string, build: Build): SceneNode {
  return createSticky(
    build.graph,
    parentId,
    {
      authorVisible: false,
      color: ANNOTATION_COLORS[pen.type] ?? DEFAULT_STICKY_COLOR,
      ...stickyShape(pen, build)
    },
    { id: pen.id }
  )
}

/**
 * Sets the fields a sticky note takes from an annotation: where it is, its box, whether it shows,
 * and its text. A sticky note keeps its own style and upright placement, as FigJam draws one.
 */
export function applyAnnotation(node: SceneNode, pen: PenNode, build: Build): void {
  const { graph, ctx } = build
  const parentLayout = (node.parentId && graph.getNode(node.parentId)?.layoutMode) || 'NONE'
  const absolute = pen.layoutPosition === 'absolute' && parentLayout !== 'NONE'
  Object.assign(node, {
    name: pen.name ?? pen.type,
    x: pen.x ?? 0,
    y: pen.y ?? 0,
    visible: resolveBoolean(pen.enabled, ctx),
    opacity: resolveNumber(pen.opacity, ctx, 1),
    layoutPositioning: absolute ? 'ABSOLUTE' : 'AUTO',
    ...annotationSizeFields(node, pen, build, absolute ? 'NONE' : parentLayout)
  } satisfies Partial<SceneNode>)
  bindIfVar(node, 'width', pen.width, ctx)
  bindIfVar(node, 'height', pen.height, ctx)
  build.placements.delete(node.id)

  const body = stickySublayers(graph, node)?.body
  const text = pen.content ?? ''
  if (body && body.text !== text) {
    body.text = text
    // A note inside an instance keeps the text an override gave it through the next sync.
    recordInstanceOverride(graph, body.id, ['text'])
  }
  applyPenPluginData(node, pen)
  build.effective.set(node.id, pen)
}
