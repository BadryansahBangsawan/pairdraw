/**
 * Goodies: tabs of things to start from, each a grid of cards. The grid follows the dialog's
 * width through its own container, so it reads the same in a narrow window.
 */
export default {
  slots: {
    body: '@container/goodies flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4',
    section: 'flex flex-col gap-2',
    heading: 'text-xs font-semibold text-surface',
    hint: 'text-xs text-muted',
    grid: 'grid grid-cols-1 gap-3 @md/goodies:grid-cols-2 @3xl/goodies:grid-cols-3',
    shaderGrid: 'grid grid-cols-2 gap-3 @md/goodies:grid-cols-3 @3xl/goodies:grid-cols-4',
    card: 'flex min-w-0 flex-col gap-2 rounded-card border border-border bg-panel p-3',
    cardHeader: 'flex min-w-0 items-center gap-2',
    cardTitle: 'min-w-0 flex-1 truncate text-xs font-medium text-surface',
    cardText: 'line-clamp-3 text-xs text-muted',
    cardAction: 'mt-auto self-start',
    swatches: 'flex h-10 overflow-hidden rounded-lg border border-border',
    swatch: 'min-w-0 flex-1',
    fonts: 'truncate text-[11px] text-muted',
    icon: 'size-4 shrink-0 text-muted',
    shader:
      'group flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-card border border-border bg-panel p-1.5 text-left outline-none transition-colors hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus',
    shaderThumb: 'block aspect-3/2 w-full overflow-hidden rounded-lg bg-input',
    shaderImage: 'size-full object-cover',
    shaderLabel: 'truncate px-1 pb-0.5 text-xs text-surface',
    library: 'flex items-center gap-3 rounded-card border border-border bg-panel p-3',
    libraryText: 'min-w-0 flex-1',
    libraryName: 'flex min-w-0 items-center gap-1 text-xs text-surface',
    libraryBadge:
      'shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium text-component',
    libraryCount: 'text-[10px] text-muted'
  }
} as const
