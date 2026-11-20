// A key pressed inside a dialog, menu, list, or picker is that widget's own, such as an arrow in
// an inline list that never opened as an overlay. One already closing is not: Reka keeps it, and
// the focus in it, until its exit animation ends, and a key pressed then belongs to the canvas.
const ANY_OVERLAY_SELECTOR =
  ':is([data-picker-content], [role="dialog"], [role="listbox"], [role="menu"])'
const OVERLAY_SELECTOR = `${ANY_OVERLAY_SELECTOR}:not([data-state="closed"])`
const PICKER_SELECTOR = '[data-picker-content]'

/** Whether the key was pressed in a widget that takes keys, such as an open menu. */
export function originatedInOverlay(event: KeyboardEvent, allowPickers = false): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof Element &&
        target.matches(OVERLAY_SELECTOR) &&
        !(allowPickers && target.closest(PICKER_SELECTOR))
    )
}
