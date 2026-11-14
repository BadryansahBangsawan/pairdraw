import { computed, type ComputedRef } from 'vue'

import { slideMoveTarget } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

/** What the Slides panel shows of a slide. */
export type SlideSummary = Pick<SceneNode, 'id' | 'name' | 'width' | 'height'>

/** The current page's slides, in slide order, refreshed as the document and page change. */
export function useSlides(store: EditorStore): ComputedRef<SlideSummary[]> {
  return computed(() => {
    void store.state.sceneVersion
    void store.state.currentPageId
    return store.getSlides().map(({ id, name, width, height }) => ({ id, name, width, height }))
  })
}

/**
 * Moves a slide before or after another, which reorders the page's layers as one undo step;
 * false when the slide order stays as it was.
 */
function moveSlide(
  store: EditorStore,
  slideId: string,
  targetId: string,
  place: 'before' | 'after'
): boolean {
  const target = slideMoveTarget(store.graph, store.state.currentPageId, slideId, targetId, place)
  if (!target) return false
  store.reorderChildWithUndo(slideId, target.parentId, target.index)
  return true
}

/** Moves a slide to `index` in the slide order, as a drop in the Slides panel does. */
export function moveSlideTo(store: EditorStore, slideId: string, index: number): boolean {
  const slides = store.getSlides()
  const from = slides.findIndex((slide) => slide.id === slideId)
  const target = slides.at(index)
  if (from === -1 || index < 0 || !target || index === from) return false
  return moveSlide(store, slideId, target.id, index > from ? 'after' : 'before')
}

/** Moves a slide one place earlier or later, as Alt+↑ and Alt+↓ do in the Slides panel. */
export function moveSlideBy(store: EditorStore, slideId: string, step: 1 | -1): boolean {
  const index = store.getSlides().findIndex((slide) => slide.id === slideId)
  return index !== -1 && moveSlideTo(store, slideId, index + step)
}
