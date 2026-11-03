import { getAxisAlignedWorldBounds } from '@open-pencil/scene-graph/coordinate'
import type { Rect, Size } from '@open-pencil/scene-graph/primitives'

import { pageSlides } from '#core/editor/bridges/frames'
import type { EditorContext } from '#core/editor/types'
import type { createViewportActions } from '#core/editor/viewport'

import type {
  CanvasView,
  PresentationScale,
  PresentView,
  ViewportCenter,
  ViewportPlace
} from './types'

/** The viewport action a presentation moves the canvas with. */
export type PresentationViewport = Pick<ReturnType<typeof createViewportActions>, 'centerOn'>

/** What a front end shows of a presentation: the slide on screen, its place, and its scale. */
export interface PresentationState {
  slideId: string
  /** The slide's place in the page's slide order, from 0. */
  index: number
  count: number
  scale: PresentationScale
}

/**
 * Where on one axis the screen's center goes: the slide's middle when the slide fits the screen,
 * otherwise as near `center` as keeps the screen inside the slide.
 */
function clampAxis(start: number, extent: number, screen: number, zoom: number, center: number) {
  const visible = screen / zoom
  if (extent <= visible) return start + extent / 2
  return Math.min(Math.max(center, start + visible / 2), start + extent - visible / 2)
}

/**
 * Where a presentation puts the canvas for a slide: fitted, the whole slide centered as large as
 * the screen holds; at 100%, the screen kept inside the slide, from its top-left corner unless
 * `scrolledTo` says where it scrolled. A slide narrower or shorter than the screen centers on
 * that axis.
 */
export function presentationViewport(
  slide: Rect,
  screen: Size,
  scale: PresentationScale,
  scrolledTo?: Pick<ViewportCenter, 'x' | 'y'>
): ViewportCenter {
  if (scale === 'fit') {
    const fitted = Math.min(screen.width / slide.width, screen.height / slide.height)
    return {
      x: slide.x + slide.width / 2,
      y: slide.y + slide.height / 2,
      zoom: Number.isFinite(fitted) && fitted > 0 ? fitted : 1
    }
  }
  const zoom = 1
  const center = scrolledTo ?? { x: -Infinity, y: -Infinity }
  return {
    x: clampAxis(slide.x, slide.width, screen.width, zoom, center.x),
    y: clampAxis(slide.y, slide.height, screen.height, zoom, center.y),
    zoom
  }
}

/** The world point at the screen's center and the zoom, as `centerOn` takes them back. */
function currentCenter(ctx: EditorContext): ViewportCenter {
  const { width, height } = ctx.getViewportSize()
  const { panX, panY, zoom } = ctx.state
  return { x: (width / 2 - panX) / zoom, y: (height / 2 - panY) / zoom, zoom }
}

function currentPlace(ctx: EditorContext): ViewportPlace {
  const { panX, panY, zoom } = ctx.state
  return { panX, panY, zoom }
}

/**
 * Puts the canvas back where it looked before the presentation started: its pan and zoom, so the
 * editor's canvas, back at its own size, shows what it showed.
 */
export function returnFromPresentation(
  ctx: EditorContext,
  view: PresentView,
  viewport: PresentationViewport
): void {
  const { width, height } = ctx.getViewportSize()
  const { panX, panY, zoom } = view.returnTo
  viewport.centerOn((width / 2 - panX) / zoom, (height / 2 - panY) / zoom, zoom)
}

/**
 * Presenting the page's slides, a slide at a time: the canvas runs as a preview and shows one
 * slide, fitted or at 100%, and steps through the slides in the page's layer order. Leaving the
 * presentation, by any way out of the view, returns the canvas to where it looked.
 */
export function createPresentationActions(
  ctx: EditorContext,
  viewport: PresentationViewport,
  setCanvasView: (view: CanvasView) => void
) {
  function presented(): PresentView | null {
    const view = ctx.state.canvasView
    return view.id === 'present' ? view : null
  }

  /** The page's slides, in the order they are presented and exported. */
  function getSlides() {
    return pageSlides(ctx.graph, ctx.state.currentPageId)
  }

  function slideBounds(slideId: string): Rect | null {
    const node = ctx.graph.getNode(slideId)
    return node ? getAxisAlignedWorldBounds(node, ctx.graph) : null
  }

  function show(view: PresentView, scrolledTo?: Pick<ViewportCenter, 'x' | 'y'>) {
    const bounds = slideBounds(view.slideId)
    if (!bounds) return
    const target = presentationViewport(bounds, ctx.getViewportSize(), view.scale, scrolledTo)
    viewport.centerOn(target.x, target.y, target.zoom)
  }

  /** The presentation on this canvas, or null while it shows something else. */
  function getPresentation(): PresentationState | null {
    const view = presented()
    if (!view) return null
    const order = getSlides()
    const index = order.findIndex((slide) => slide.id === view.slideId)
    if (index === -1) return null
    return { slideId: view.slideId, index, count: order.length, scale: view.scale }
  }

  /**
   * Presents the page's slides from `slideId`, or from the slide holding the selection, or from
   * the first; false when the page has no slides.
   */
  function startPresentation(slideId?: string): boolean {
    const order = getSlides()
    if (order.length === 0) return false
    const ids = new Set(order.map((slide) => slide.id))
    const [selectedId] = ctx.state.selectedIds
    const holding = selectedId ? ctx.graph.closest(selectedId, (node) => ids.has(node.id)) : null
    const start = (slideId && ids.has(slideId) ? slideId : null) ?? holding?.id ?? order[0].id
    const current = presented()
    const view: PresentView = {
      id: 'present',
      revision: current?.revision ?? 0,
      slideId: start,
      scale: current?.scale ?? 'fit',
      returnTo: current?.returnTo ?? currentPlace(ctx)
    }
    ctx.state.hoveredNodeId = null
    setCanvasView(view)
    show(view)
    return true
  }

  /** Leaves the presentation for editing, back where the canvas looked before it. */
  function stopPresentation(): void {
    if (presented()) setCanvasView({ id: 'edit' })
  }

  function togglePresentation(): void {
    if (presented()) stopPresentation()
    else startPresentation()
  }

  /** Shows another slide of the presentation; false when there is none to show. */
  function presentSlide(slideId: string): boolean {
    const view = presented()
    if (!view || !getSlides().some((slide) => slide.id === slideId)) return false
    const next: PresentView = { ...view, slideId }
    setCanvasView(next)
    show(next)
    return true
  }

  /**
   * Steps to the next or previous slide; false at either end, where the presentation stays. A
   * slide removed while it was shown ends the presentation.
   */
  function presentAdjacentSlide(step: 1 | -1): boolean {
    const view = presented()
    if (!view) return false
    const order = getSlides()
    const index = order.findIndex((slide) => slide.id === view.slideId)
    if (index === -1) {
      stopPresentation()
      return false
    }
    const target = order.at(index + step)
    return index + step >= 0 && target ? presentSlide(target.id) : false
  }

  function presentNextSlide(): boolean {
    return presentAdjacentSlide(1)
  }

  function presentPreviousSlide(): boolean {
    return presentAdjacentSlide(-1)
  }

  /** Shows the slide fitted to the screen or at 100%. */
  function setPresentationScale(scale: PresentationScale): void {
    const view = presented()
    if (!view || view.scale === scale) return
    const next: PresentView = { ...view, scale }
    setCanvasView(next)
    show(next)
  }

  /** Puts the slide back in place, as after the screen changed size. */
  function fitPresentation(): void {
    const view = presented()
    if (!view) return
    show(view, view.scale === 'actual' ? currentCenter(ctx) : undefined)
  }

  /**
   * Scrolls a slide shown at 100% by screen pixels, within the slide; false when it is already
   * at that edge or fits the screen, so a front end can step to the next slide instead.
   */
  function scrollPresentation(dx: number, dy: number): boolean {
    const view = presented()
    if (view?.scale !== 'actual') return false
    const bounds = slideBounds(view.slideId)
    if (!bounds) return false
    const from = currentCenter(ctx)
    const target = presentationViewport(bounds, ctx.getViewportSize(), 'actual', {
      x: from.x + dx / from.zoom,
      y: from.y + dy / from.zoom
    })
    if (Math.abs(target.x - from.x) < 0.5 && Math.abs(target.y - from.y) < 0.5) return false
    viewport.centerOn(target.x, target.y, target.zoom)
    return true
  }

  // Another document has other slides, so its arrival ends the presentation; the canvas stays
  // where the new document puts it rather than returning to a place in the old one.
  ctx.onEditorEvent('graph:replaced', () => {
    if (!presented()) return
    ctx.state.canvasView = { id: 'edit' }
    ctx.requestRepaint()
  })

  return {
    getSlides,
    getPresentation,
    startPresentation,
    stopPresentation,
    togglePresentation,
    presentSlide,
    presentNextSlide,
    presentPreviousSlide,
    setPresentationScale,
    fitPresentation,
    scrollPresentation
  }
}
