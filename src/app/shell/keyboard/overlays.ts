// Fallback for overlays that do not register through `useOverlayOpen` yet: menus, popovers, and
// context menus built on Reka's roots directly. Remove once they all go through shared wrappers.
const OVERLAY_SELECTOR = '[data-picker-content], [role="dialog"], [role="listbox"], [role="menu"]'
const PICKER_SELECTOR = '[data-picker-content]'
const OPEN_LAYER_SELECTOR = '[data-dismissable-layer]:not([data-state="closed"])'

/** An overlay on its way out, still drawn for its exit animation but holding nothing back. */
function isClosing(element: Element): boolean {
  return element.closest('[data-state="closed"]') !== null
}

function originatedInOverlay(event: KeyboardEvent, allowPickers: boolean) {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof Element &&
        target.matches(OVERLAY_SELECTOR) &&
        !isClosing(target) &&
        !(allowPickers && target.closest(PICKER_SELECTOR))
    )
}

/** A popover, menu, or dialog that is open; one fading out after closing no longer counts. */
function hasOpenDismissableLayer(allowPickers: boolean) {
  return [...document.querySelectorAll(OPEN_LAYER_SELECTOR)].some(
    (layer) => !isClosing(layer) && !(allowPickers && layer.closest(PICKER_SELECTOR))
  )
}

/** Whether a menu, list, dialog, or picker is showing, whoever holds the keyboard focus. */
function hasOpenOverlay(allowPickers: boolean): boolean {
  return [...document.querySelectorAll(OVERLAY_SELECTOR)].some((element) => {
    if (allowPickers && element.closest(PICKER_SELECTOR)) return false
    if (isClosing(element)) return false
    if (element.getClientRects().length === 0) return false
    return getComputedStyle(element).visibility !== 'hidden'
  })
}

/**
 * Whether an open dialog, menu, list, or picker holds the canvas's keys back, shortcuts and
 * nudging alike; `history` asks about undo and redo, which a picker leaves to the document.
 * The overlay need not hold focus: a nudging arrow key is pressed while the canvas is focused.
 */
export function overlayHoldsKeys(event: KeyboardEvent, history = false): boolean {
  return (
    hasOpenOverlay(history) ||
    hasOpenDismissableLayer(history) ||
    originatedInOverlay(event, history)
  )
}

/**
 * Whether an open menu, list, or picker takes the arrow keys a nudge would use. A dialog holds
 * them through its own focus rather than by being mounted: one closing after Done is still drawn
 * for a moment, and nudging resumes as soon as its focus is back on the canvas.
 */
export function nudgeBlocked(event: KeyboardEvent): boolean {
  return hasOpenOverlay(false) || originatedInOverlay(event, false)
}
