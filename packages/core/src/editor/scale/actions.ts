import type { Rect, Vector } from '@open-pencil/scene-graph/primitives'
import { MIN_RESCALE } from '@open-pencil/scene-graph/scaling'

import type { NodePreview } from '#core/editor/node-preview'
import type { EditorContext } from '#core/editor/types'

import { DEFAULT_SCALE_ANCHOR, type ScaleAnchor } from './anchor'
import { captureRescale, rescaleBounds, rescaleChanges } from './rescale'

/**
 * A scale in progress, from the Scale tool's handles or its panel: each `update` shows the layers
 * scaled from where they were when it began, and `commit` records one undo step.
 */
export interface ScaleSession {
  /** The selection's box on the canvas when the scale began. */
  readonly bounds: Rect
  /** The ids of the layers it scales; their sublayers scale with them. */
  readonly rootIds: readonly string[]
  readonly closed: boolean
  update: (factor: number, anchor?: ScaleAnchor | Vector) => void
  commit: () => void
  cancel: () => void
}

/** The Scale tool's edits: layers scale with their text, strokes, effects, radii, and spacing. */
export function createScaleActions(
  ctx: EditorContext,
  beginNodePreview: (label?: string) => NodePreview
) {
  /** The layers among `ids` the user may scale: not locked, as the canvas leaves those alone. */
  function unlocked(ids: Iterable<string>): string[] {
    return [...ids].filter((id) => ctx.graph.getNode(id)?.locked === false)
  }

  /**
   * Starts scaling the layers `ids`; null when none of them can scale. Selection, page, and
   * document changes cancel it, as they cancel any preview.
   */
  function beginScale(ids: Iterable<string>, label = 'Scale'): ScaleSession | null {
    const snapshot = captureRescale(ctx.graph, unlocked(ids))
    if (!snapshot) return null
    const preview = beginNodePreview(label)
    return {
      bounds: snapshot.bounds,
      rootIds: snapshot.roots.map((root) => root.id),
      get closed() {
        return preview.closed
      },
      update(factor, anchor = DEFAULT_SCALE_ANCHOR) {
        const changes = rescaleChanges(ctx.graph, snapshot, Math.max(MIN_RESCALE, factor), anchor)
        for (const [id, change] of changes) preview.update(id, change)
      },
      commit: () => preview.commit(),
      cancel: () => preview.cancel()
    }
  }

  /**
   * Scales the layers `ids` by `factor` around `anchor`, a point of their joint box (the top left
   * by default) or a canvas point, as one undo step. Returns the ids of the layers it scaled.
   */
  function scaleNodes(
    ids: Iterable<string>,
    factor: number,
    anchor: ScaleAnchor | Vector = DEFAULT_SCALE_ANCHOR
  ): string[] {
    if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return []
    const session = beginScale(ids)
    if (!session) return []
    session.update(factor, anchor)
    session.commit()
    return [...session.rootIds]
  }

  /** The selected layers' joint box on the canvas, as the Scale panel's width and height show. */
  function scaleSelectionBounds(): Rect | null {
    return rescaleBounds(ctx.graph, unlocked(ctx.state.selectedIds))
  }

  return { beginScale, scaleNodes, scaleSelectionBounds }
}

export type ScaleActions = ReturnType<typeof createScaleActions>
