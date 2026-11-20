import { FRAME_LAYOUT_DEFAULTS } from './node-defaults'
import type { SceneNode } from './types'

type FrameLayoutField = keyof typeof FRAME_LAYOUT_DEFAULTS

/**
 * `overrides` for a node of `type`, without the layout a page cannot hold. A document that names
 * one on a page still loads: the field a page never stores simply does not arrive.
 */
export function pageLayoutOverrides(
  type: SceneNode['type'],
  overrides: Partial<SceneNode>
): Partial<SceneNode> {
  if (type !== 'CANVAS') return overrides
  const kept: Partial<SceneNode> = { ...overrides }
  const taken = (field: FrameLayoutField) =>
    kept[field] !== undefined && kept[field] !== FRAME_LAYOUT_DEFAULTS[field]
  if (taken('layoutMode')) delete kept.layoutMode
  if (taken('layoutDirection')) delete kept.layoutDirection
  if (taken('layoutWrap')) delete kept.layoutWrap
  if (taken('primaryAxisAlign')) delete kept.primaryAxisAlign
  if (taken('counterAxisAlign')) delete kept.counterAxisAlign
  if (taken('primaryAxisSizing')) delete kept.primaryAxisSizing
  if (taken('counterAxisSizing')) delete kept.counterAxisSizing
  if (taken('itemSpacing')) delete kept.itemSpacing
  if (taken('counterAxisSpacing')) delete kept.counterAxisSpacing
  if (taken('paddingTop')) delete kept.paddingTop
  if (taken('paddingRight')) delete kept.paddingRight
  if (taken('paddingBottom')) delete kept.paddingBottom
  if (taken('paddingLeft')) delete kept.paddingLeft
  return kept
}

/** A page was given auto layout or one of the properties an auto layout frame holds. */
export class CanvasLayoutError extends Error {
  readonly pageId: string
  readonly field: FrameLayoutField

  constructor(pageId: string, field: FrameLayoutField) {
    super(
      `A page cannot hold auto layout (${field} was set on ${pageId}). Set auto layout on a frame inside the page.`
    )
    this.name = 'CanvasLayoutError'
    this.pageId = pageId
    this.field = field
  }
}

/**
 * `changes` without a geometry value that is not finite. A layout that cannot use its container
 * can compute one; dropping it leaves the layer where it was rather than corrupting the document.
 */
export function finiteGeometry(changes: Partial<SceneNode>): Partial<SceneNode> {
  const usable = (value: number | undefined) => value === undefined || Number.isFinite(value)
  const { x, y, width, height } = changes
  if (usable(x) && usable(y) && usable(width) && usable(height)) return changes
  const kept: Partial<SceneNode> = { ...changes }
  if (!usable(x)) delete kept.x
  if (!usable(y)) delete kept.y
  if (!usable(width)) delete kept.width
  if (!usable(height)) delete kept.height
  return kept
}

/**
 * Refuses the layout a page cannot hold, before it reaches the graph. Values equal to the ones a
 * page already holds pass, so a reader that writes a whole node leaves a page alone.
 */
export function assertPageLayout(node: SceneNode, changes: Partial<SceneNode>): void {
  if (node.type !== 'CANVAS') return
  for (const [field, empty] of Object.entries(FRAME_LAYOUT_DEFAULTS)) {
    const value = changes[field as FrameLayoutField]
    if (value !== undefined && value !== empty)
      throw new CanvasLayoutError(node.id, field as FrameLayoutField)
  }
}
