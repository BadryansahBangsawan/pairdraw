const splitterTheme = {
  slots: {
    handle:
      'group relative z-10 shrink-0 touch-none outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    divider:
      'pointer-events-none absolute bg-border transition-colors group-data-[state=drag]:bg-accent group-data-[state=hover]:bg-accent group-focus-visible:bg-accent'
  },
  variants: {
    direction: {
      horizontal: {
        handle: '-mx-1 w-2 cursor-col-resize',
        divider: 'inset-y-0 left-1/2 w-px -translate-x-1/2'
      },
      vertical: {
        handle: '-my-1 h-2 cursor-row-resize',
        divider: 'inset-x-0 top-1/2 h-px -translate-y-1/2'
      }
    },
    // At a card's edge, which draws its own border: no line until the handle is hovered or dragged.
    // The handle stacks above the cards it overlaps, so its whole width starts a resize.
    seam: {
      true: { handle: 'z-20', divider: 'inset-y-2.5 rounded-full bg-transparent' }
    }
  },
  defaultVariants: {
    seam: false
  }
}
export default splitterTheme
