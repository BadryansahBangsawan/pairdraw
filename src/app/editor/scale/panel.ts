import { onScopeDispose, ref } from 'vue'

import {
  DEFAULT_SCALE_ANCHOR,
  scaleFactorForSize,
  type ScaleAnchor,
  type ScaleSession
} from '@open-pencil/core'
import type { Rect } from '@open-pencil/scene-graph/primitives'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import type { EditorStore } from '@/app/editor/active-store'

/** The anchor the Scale panel scales from; it stays picked while the app runs, as in Figma. */
const scaleAnchor = ref<ScaleAnchor>(DEFAULT_SCALE_ANCHOR)

/** Which value of the Scale panel a factor comes from. */
export type ScaleField = 'width' | 'height' | 'factor'

/**
 * The factor a Scale panel value asks for, read against the selection's box as the edit found it:
 * a width or height to reach, or a factor itself, typed as a percentage when `unit` is `%`.
 */
export function scaleFieldFactor(
  field: ScaleField,
  value: number,
  bounds: Rect,
  unit?: string
): number | null {
  if (field === 'width') return scaleFactorForSize(bounds.width, value)
  if (field === 'height') return scaleFactorForSize(bounds.height, value)
  const factor = unit === '%' ? value / 100 : value
  return Number.isFinite(factor) && factor > 0 ? factor : null
}

/**
 * The Scale panel's edits: scrubbing a field previews the selection scaled from the anchor, and a
 * commit records it as one undo step; a typed value scales at once.
 */
export function useScalePanel(store: EditorStore) {
  const bounds = useSceneComputed(() => store.scaleSelectionBounds())
  let session: ScaleSession | null = null

  function liveSession(): ScaleSession | null {
    if (session?.closed) session = null
    session ??= store.beginScale(store.state.selectedIds)
    return session
  }

  function preview(field: ScaleField, value: number, unit?: string) {
    const current = liveSession()
    const factor = current && scaleFieldFactor(field, value, current.bounds, unit)
    if (current && factor) current.update(factor, scaleAnchor.value)
  }

  function commit(field: ScaleField, value: number, unit?: string) {
    const open = session && !session.closed ? session : null
    session = null
    const from = open?.bounds ?? bounds.value
    const factor = from && scaleFieldFactor(field, value, from, unit)
    if (!open) {
      if (factor) store.scaleNodes(store.state.selectedIds, factor, scaleAnchor.value)
      return
    }
    if (factor) open.update(factor, scaleAnchor.value)
    open.commit()
  }

  function cancel() {
    session?.cancel()
    session = null
  }

  onScopeDispose(cancel)

  return { anchor: scaleAnchor, bounds, preview, commit, cancel }
}
