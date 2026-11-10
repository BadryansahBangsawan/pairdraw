/**
 * A slide in the Slides panel: its number, then its thumbnail with the slide's name below. The
 * thumbnail keeps the slide's proportions inside a fixed-height frame.
 */
const slidesRowTheme = {
  slots: {
    root: 'group/slide relative flex cursor-grab items-start gap-1.5 rounded-field p-1.5 active:cursor-grabbing',
    number: 'w-4 shrink-0 pt-0.5 text-end text-[11px] text-muted tabular-nums',
    card: 'flex min-w-0 flex-1 flex-col gap-1 rounded-field text-start outline-none focus-visible:ring-2 focus-visible:ring-panel-focus',
    frame:
      'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-field border border-border bg-canvas',
    name: 'truncate text-xs text-surface',
    present:
      'absolute end-2.5 top-2.5 opacity-0 transition-opacity group-hover/slide:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
    dropIndicator: 'pointer-events-none absolute inset-x-1.5 z-10 h-0.5 rounded-full bg-accent'
  },
  variants: {
    selected: {
      true: { root: 'bg-panel-selected-muted', frame: 'border-accent ring-1 ring-accent' },
      false: { root: 'hover:bg-hover' }
    },
    dragging: {
      true: { root: 'opacity-60' },
      false: {}
    },
    dropPosition: {
      before: { dropIndicator: '-top-0.5' },
      after: { dropIndicator: '-bottom-0.5' }
    }
  },
  defaultVariants: {
    selected: false,
    dragging: false
  }
}

export default slidesRowTheme
