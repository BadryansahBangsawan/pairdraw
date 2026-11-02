/**
 * The page list: rows as tall as the layer rows, with the current page tinted like a selected
 * layer. Row labels line up with the header's title.
 */
const pageListTheme = {
  slots: {
    panel: 'flex min-h-0 flex-1 flex-col',
    header: 'flex h-9 shrink-0 items-center justify-between pr-2 pl-3.5',
    title: 'text-xs font-medium text-surface',
    body: 'min-h-0 flex-1 overflow-hidden',
    viewport: 'scrollbar-thin h-full overflow-x-hidden overflow-y-auto px-2 pb-2',
    row: 'relative cursor-grab active:cursor-grabbing',
    dropIndicator: 'pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-accent',
    renameRow: 'flex h-6.5 w-full items-center gap-1.5 rounded-field px-1.5',
    icon: 'size-3 shrink-0 opacity-70',
    renameInput:
      'min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none',
    divider: 'my-1 flex cursor-pointer items-center px-1.5',
    dividerLine: 'h-px flex-1 bg-border',
    item: 'flex h-6.5 w-full cursor-pointer items-center gap-1.5 rounded-field border-none px-1.5 text-left text-xs text-surface outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    label: 'min-w-0 flex-1 truncate',
    /** Right-aligned page badges, such as who works on the page. */
    trailing: 'flex shrink-0 items-center gap-1.5'
  },
  variants: {
    active: {
      true: { item: 'bg-panel-selected-muted', icon: 'opacity-100' },
      false: { item: 'bg-transparent hover:bg-hover' }
    },
    dragging: {
      true: { row: 'opacity-60' },
      false: {}
    },
    dropPosition: {
      before: { dropIndicator: 'top-0' },
      after: { dropIndicator: 'bottom-0' }
    }
  },
  defaultVariants: {
    active: false,
    dragging: false
  }
}

export type PageListTheme = typeof pageListTheme
export default pageListTheme
