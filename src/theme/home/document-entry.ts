/**
 * One document on the home tab. In the grid it is a card, a preview over its name and date, that
 * lifts under the pointer; in the list it is a row. Columns that need room follow the documents
 * card's width (`@container/home` in `home/layout.ts`). A selected entry (`data-selected`) takes
 * an accent ring and a check in the grid, and the selected-row tint in the list.
 */
export default {
  slots: {
    root: 'group relative min-w-0',
    trigger:
      'w-full min-w-0 cursor-pointer text-left outline-none select-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
    preview:
      'flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-panel-field',
    image:
      'size-full object-cover transition-transform duration-200 group-hover:scale-[1.015] motion-reduce:transition-none',
    fallback: 'size-8 text-muted/40',
    icon: 'size-4 shrink-0 text-muted',
    selectedIcon: 'size-4 shrink-0 text-accent',
    selectedMark:
      'pointer-events-none absolute top-3 left-3 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-xs',
    body: 'min-w-0 flex-1',
    title: 'flex min-w-0 items-center gap-1.5',
    name: 'block min-w-0 truncate text-xs font-medium text-surface',
    status: 'flex shrink-0 items-center gap-1 text-muted',
    metadata: 'mt-0.5 block truncate text-[11px] text-muted',
    trailingMetadata: 'hidden shrink-0 text-[11px] text-muted',
    actions: 'flex shrink-0 items-center gap-1',
    // Over an icon button: shown on hover, focus, and while open; always on touch screens.
    menuTrigger:
      'shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100',
    menuItem: 'group/item data-[tone=danger]:text-error',
    menuIcon: 'size-3.5 shrink-0 text-muted group-data-[tone=danger]/item:text-error'
  },
  variants: {
    view: {
      grid: {
        trigger:
          'block rounded-card border border-border bg-panel p-1.5 transition-[border-color,box-shadow] duration-150 group-hover:border-muted/40 group-hover:elevation-card group-data-[selected]:border-accent group-data-[selected]:ring-1 group-data-[selected]:ring-accent motion-reduce:transition-none',
        body: 'block px-1.5 pt-2.5 pb-1.5',
        menuTrigger: 'absolute top-3 right-3 bg-panel/90 shadow-xs'
      },
      list: {
        root: 'flex items-center border-b border-border last:border-b-0 hover:bg-hover data-[selected]:bg-panel-selected-muted',
        trigger:
          'flex min-h-14 items-center gap-3 px-3 py-2 @md/home:min-h-0 @md/home:px-4 @md/home:py-3',
        metadata: '@md/home:hidden',
        trailingMetadata: '@md/home:inline',
        menuTrigger: 'mr-2 @md/home:mr-3'
      }
    }
  },
  defaultVariants: { view: 'grid' }
} as const
