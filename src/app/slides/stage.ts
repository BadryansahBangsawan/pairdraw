import { useElementSize, useEventListener, useSwipe } from '@vueuse/core'
import { computed, onMounted, watch, type Ref } from 'vue'

import type { PresentationState, VisibleCanvas } from '@pairdraw/core'

import type { EditorStore } from '@/app/editor/active-store'
import { isButtonActivation, isEditing } from '@/app/shell/keyboard/focus'

import { usePresentationFullscreen } from './fullscreen'
import { presentationKeyAction, presentationScrollStep, type PresentationKeyAction } from './keys'
import { letterboxRects, nodeStageRect } from './letterbox'
import { createWheelStepper } from './wheel'

/** WebKit's pinch events, which the DOM's event maps do not list. */
const WEBKIT_GESTURE_EVENTS: string[] = ['gesturestart', 'gesturechange', 'gestureend']

/** Pixels a wheel line scrolls, for wheels that report lines rather than pixels. */
const WHEEL_LINE_HEIGHT = 16

/**
 * What a click belongs to instead of the deck: the live controls, anything editable, and media a
 * slide embeds, whose own click plays, opens, or follows it.
 */
const CLICK_KEEPS_TARGETS =
  'a, button, input, select, textarea, [role="button"], [contenteditable="true"], iframe, video, audio'

/** Runs `fn` once the canvas has taken its new size, which it does a frame after a resize. */
function afterCanvasResize(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

/**
 * The presentation's stage: it keeps the slide in place as the screen changes, takes the
 * presentation's keys, wheel, and swipes, blacks out what is around the slide, and stops the
 * canvas from panning, zooming, or selecting while live controls and links on the slide still
 * take the pointer.
 */
export function usePresentationStage(store: EditorStore, stage: Ref<HTMLElement | null>) {
  const presentation = computed<PresentationState | null>(() => {
    void store.state.sceneVersion
    void store.state.currentPageId
    return store.getPresentation()
  })
  const size = useElementSize(stage)

  /** The slide's rectangle on the stage, following the canvas's pan and zoom. */
  const slideRect = computed<VisibleCanvas | null>(() => {
    const shown = presentation.value
    return shown ? nodeStageRect(store.graph, shown.slideId, store.state) : null
  })

  const letterbox = computed(() =>
    slideRect.value
      ? letterboxRects(slideRect.value, { width: size.width.value, height: size.height.value })
      : []
  )

  // A slide removed or hidden while it is shown, or a page switched away, ends the presentation.
  watch(presentation, (shown) => {
    if (!shown) store.stopPresentation()
  })

  onMounted(() => store.fitPresentation())
  watch([size.width, size.height], () => afterCanvasResize(() => store.fitPresentation()))

  usePresentationFullscreen(() => store.stopPresentation())

  function step(action: PresentationKeyAction, scrollBy: number) {
    const shown = presentation.value
    if (!shown) return
    switch (action) {
      case 'next':
        store.presentNextSlide()
        break
      case 'previous':
        store.presentPreviousSlide()
        break
      case 'forward':
        if (!store.scrollPresentation(0, scrollBy)) store.presentNextSlide()
        break
      case 'back':
        if (!store.scrollPresentation(0, -scrollBy)) store.presentPreviousSlide()
        break
      case 'first':
        store.presentSlide(store.getSlides()[0]?.id ?? shown.slideId)
        break
      case 'last':
        store.presentSlide(store.getSlides().at(-1)?.id ?? shown.slideId)
        break
    }
  }

  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditing(event) || isButtonActivation(event)) return
      const action = presentationKeyAction(event)
      if (!action) return
      event.preventDefault()
      event.stopPropagation()
      step(action, presentationScrollStep(event.code, size.height.value))
    },
    { capture: true }
  )

  // Swipes listen in the capture phase, ahead of the canvas guard below, which would otherwise
  // keep the canvas's touches from them.
  useSwipe(stage, {
    passive: false,
    onSwipeEnd: (_event, direction) => {
      if (direction === 'left') step('next', 0)
      else if (direction === 'right') step('previous', 0)
      else if (direction === 'up') step('forward', size.height.value * 0.9)
      else if (direction === 'down') step('back', size.height.value * 0.9)
    }
  })

  // The canvas only shows the slide: it neither pans, zooms, nor selects, nor opens its menu.
  // A plain click still reaches it, so it steps the deck forward (`step` below) unless the play
  // profile took it for a link on the slide's text, which stops the event at the canvas; the
  // middle button, the Hand tool, and touches would pan. Live controls on the slide are elements
  // of their own, so they keep the pointer.
  useEventListener(
    stage,
    ['pointerdown', 'mousedown'],
    (event: MouseEvent) => {
      if (!(event.target instanceof HTMLCanvasElement)) return
      if (event.button === 0 && store.state.activeTool !== 'HAND') return
      event.preventDefault()
      event.stopPropagation()
    },
    { capture: true }
  )

  // A click steps forward, as Space and Enter do: it scrolls a slide shown at 100% to its end
  // first, then goes to the next slide. The live controls and anything embedded in a slide keep
  // their own clicks, and a link a click followed never reaches here.
  useEventListener(stage, 'mousedown', (event: MouseEvent) => {
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    if (event.target instanceof Element && event.target.closest(CLICK_KEEPS_TARGETS)) return
    step('forward', presentationScrollStep('Space', size.height.value))
  })
  useEventListener(
    stage,
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
    (event: TouchEvent) => {
      if (event.target instanceof HTMLCanvasElement) event.stopPropagation()
    },
    { capture: true, passive: true }
  )
  // WebKit reports trackpad pinches as gestures, which the canvas's container zooms with.
  useEventListener(
    stage,
    WEBKIT_GESTURE_EVENTS,
    (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    },
    { capture: true, passive: false }
  )
  useEventListener(
    stage,
    'contextmenu',
    (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    },
    { capture: true }
  )

  // The wheel scrolls a slide shown at 100%, and steps to the next or previous slide where it
  // cannot scroll: always when the slide fits, and past its end at 100%.
  const wheel = createWheelStepper()
  useEventListener(
    stage,
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_HEIGHT : 1
      const deltaX = event.deltaX * scale
      const deltaY = event.deltaY * scale
      if (store.scrollPresentation(deltaX, deltaY)) {
        wheel.reset()
        return
      }
      const action = wheel.turn({ deltaX, deltaY, time: event.timeStamp })
      if (action) step(action, 0)
    },
    { capture: true, passive: false }
  )

  return { presentation, letterbox, step }
}
