import type { SceneGraph } from '@open-pencil/scene-graph'
import { computeBounds } from '@open-pencil/scene-graph/geometry'
import type { Rect } from '@open-pencil/scene-graph/primitives'

/** Space between variants, and between the variants and what is already on the page. */
const VARIANT_GAP = 120

/**
 * Where a row of variants goes: right of everything on the page, at the top of the design they
 * vary or of the page's content, so none covers a layer already there.
 */
export interface VariantPlacement {
  x: number
  y: number
  gap: number
  /** The size of the design the variants start from, when they start from one. */
  size: { width: number; height: number } | null
}

function rounded(value: number): number {
  return Math.round(value)
}

/** The page's top-level layers' bounds, or null on an empty page. */
function contentBounds(graph: SceneGraph, pageId: string): Rect | null {
  const children = graph.getChildren(pageId)
  if (children.length === 0) return null
  return computeBounds(children.map((child) => graph.getAbsoluteBounds(child.id)))
}

/**
 * Where variants of `baseId`'s design, or of a new one, go on the page. A base on another page
 * still sets their size, while the row stays on the page the agent draws on.
 */
export function variantPlacement(
  graph: SceneGraph,
  pageId: string,
  baseId?: string
): VariantPlacement {
  const content = contentBounds(graph, pageId)
  const base = baseId ? graph.getNode(baseId) : undefined
  const baseBounds = base && base.type !== 'CANVAS' ? graph.getAbsoluteBounds(base.id) : null
  const onPage = baseBounds !== null && base !== undefined && graph.pageOf(base.id) === pageId
  return {
    x: content ? rounded(content.x + content.width + VARIANT_GAP) : 0,
    y: rounded((onPage ? baseBounds.y : content?.y) ?? 0),
    gap: VARIANT_GAP,
    size: baseBounds
      ? { width: rounded(baseBounds.width), height: rounded(baseBounds.height) }
      : null
  }
}

/** The left edge of each of `count` variants when their size is known, else null. */
export function variantColumns(placement: VariantPlacement, count: number): number[] | null {
  const { size } = placement
  if (!size || size.width <= 0) return null
  return Array.from({ length: count }, (_, index) =>
    rounded(placement.x + index * (size.width + placement.gap))
  )
}
