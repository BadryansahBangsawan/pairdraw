/** A button inside a banner, on its warning tint. */
const bannerAction =
  'shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 font-medium text-warning-action transition-colors hover:bg-warning/20 disabled:cursor-default disabled:opacity-50'

/**
 * A window-wide notice above the top bar: an inset rounded strip on the backdrop, like the panel
 * cards below it.
 */
const bannerTheme = {
  slots: {
    root: 'mx-2.5 mt-2.5 flex shrink-0 items-center gap-2 rounded-field border border-warning-border bg-warning-bg px-3 py-1.5 text-xs text-warning',
    content: 'min-w-0 flex-1',
    dismiss: bannerAction,
    action: bannerAction
  }
}

export default bannerTheme
