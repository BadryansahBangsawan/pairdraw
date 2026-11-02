const canvasPaneHeaderTheme = {
  slots: {
    root: 'relative flex h-8 shrink-0 items-center gap-1 border-b border-border bg-panel px-2 text-muted after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-transparent',
    title: 'min-w-0 flex-1 truncate px-1 text-xs',
    zoom: 'shrink-0 px-1 text-xs tabular-nums text-muted',
    actions: 'flex shrink-0 items-center gap-0.5',
    icon: 'size-3.5'
  },
  variants: {
    active: {
      true: {
        root: 'text-surface after:bg-accent'
      },
      false: {}
    }
  },
  defaultVariants: {
    active: false
  }
}

export type CanvasPaneHeaderTheme = typeof canvasPaneHeaderTheme
export default canvasPaneHeaderTheme
