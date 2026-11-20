/**
 * The floating chrome over the canvas: the tool rail on the left and the pill in the bottom corner
 * stand above the canvas element, so fitting a document to the element hides its left edge under
 * them. Each piece names the sides it takes in `data-canvas-inset`, and the canvas reports the room
 * they leave to the editor.
 */
import type { ViewportInsets } from '@/app/document/io/types'

/** The canvas sides a floating piece takes. */
export type CanvasSide = 'top' | 'right' | 'bottom' | 'left'

/** One floating piece and the edges it sits against. */
export interface ChromePiece {
  /** A box in screen pixels, as `getBoundingClientRect` reports it. */
  rect: ViewportInsets
  sides: readonly CanvasSide[]
}

/** The attribute a floating piece carries, such as `data-canvas-inset="left"`. */
export const CANVAS_INSET_ATTRIBUTE = 'data-canvas-inset'

const SIDES: ReadonlySet<string> = new Set(['top', 'right', 'bottom', 'left'])

/** The room the chrome leaves, measured from the canvas edges it sits against. */
export function insetsFromChrome(
  canvas: ViewportInsets,
  chrome: readonly ChromePiece[]
): ViewportInsets {
  const insets: ViewportInsets = { top: 0, right: 0, bottom: 0, left: 0 }
  const edges = {
    top: canvas.top,
    right: canvas.right,
    bottom: canvas.bottom,
    left: canvas.left
  }
  for (const { rect, sides } of chrome) {
    if (rect.right <= rect.left || rect.bottom <= rect.top) continue
    const room: Record<CanvasSide, number> = {
      top: rect.bottom - edges.top,
      right: edges.right - rect.left,
      bottom: edges.bottom - rect.top,
      left: rect.right - edges.left
    }
    for (const side of sides) insets[side] = Math.max(insets[side], Math.ceil(room[side]))
  }
  return insets
}

/**
 * The nearest element around the canvas that holds floating chrome. A split view wraps the canvas
 * a few levels deep, so the toolbar is an ancestor's child, not the canvas's sibling.
 */
function chromeContainer(canvas: HTMLElement): HTMLElement | null {
  const selector = `[${CANVAS_INSET_ATTRIBUTE}]`
  for (let node = canvas.parentElement; node; node = node.parentElement) {
    if (node.querySelector(selector)) return node
  }
  return null
}

/** The floating chrome over the canvas, read from the elements that declare their sides. */
export function canvasChromeInsets(canvas: HTMLElement): ViewportInsets {
  const container = chromeContainer(canvas)
  if (!container) return insetsFromChrome(canvas.getBoundingClientRect(), [])
  const chrome: ChromePiece[] = []
  for (const element of container.querySelectorAll<HTMLElement>(`[${CANVAS_INSET_ATTRIBUTE}]`)) {
    const sides = (element.getAttribute(CANVAS_INSET_ATTRIBUTE) ?? '')
      .split(/\s+/)
      .filter((side): side is CanvasSide => SIDES.has(side))
    if (sides.length === 0) continue
    chrome.push({ rect: element.getBoundingClientRect(), sides })
  }
  return insetsFromChrome(canvas.getBoundingClientRect(), chrome)
}
