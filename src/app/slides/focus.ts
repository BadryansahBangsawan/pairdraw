import { nextTick } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'

/**
 * The control that started a presentation. The presentation replaces the editor, so the control
 * itself is gone when it ends; its test id, and the slide it sits in, find its successor.
 */
interface PresentationOrigin {
  element: HTMLElement
  testId: string | null
  slideId: string | null
}

const origins = new WeakMap<EditorStore, PresentationOrigin>()

/** Remembers where focus is as `store` starts presenting, to give it back afterwards. */
export function rememberPresentationOrigin(store: EditorStore): void {
  const element = document.activeElement
  if (!(element instanceof HTMLElement) || element === document.body) {
    origins.delete(store)
    return
  }
  origins.set(store, {
    element,
    testId: element.dataset.testId ?? null,
    slideId: element.closest<HTMLElement>('[data-slide-id]')?.dataset.slideId ?? null
  })
}

function findOrigin(origin: PresentationOrigin): HTMLElement | null {
  if (origin.element.isConnected) return origin.element
  if (!origin.testId) return null
  const control = `[data-test-id="${CSS.escape(origin.testId)}"]`
  const scope = origin.slideId ? `[data-slide-id="${CSS.escape(origin.slideId)}"] ` : ''
  return (
    document.querySelector<HTMLElement>(scope + control) ??
    document.querySelector<HTMLElement>(control)
  )
}

/**
 * Gives focus back to the control that started the presentation once the editor is back on
 * screen; nothing is focused when that control no longer exists.
 */
export function restorePresentationOrigin(store: EditorStore): void {
  const origin = origins.get(store)
  origins.delete(store)
  if (!origin) return
  void nextTick(() =>
    requestAnimationFrame(() => {
      const active = document.activeElement
      // Something the person focused meanwhile keeps focus.
      if (active instanceof HTMLElement && active !== document.body) return
      findOrigin(origin)?.focus({ preventScroll: true })
    })
  )
}
