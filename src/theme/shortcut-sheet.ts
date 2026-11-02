/**
 * The keyboard shortcut sheet. Its sections flow into columns by the sheet's own width
 * (`@container/shortcuts`), so a narrow window or a phone shows one column.
 */
export default {
  slots: {
    search: 'w-full',
    searchIcon: 'size-4 text-muted',
    body: '@container/shortcuts',
    grid: 'mt-4 grid grid-cols-1 gap-x-6 gap-y-5 @xl/shortcuts:grid-cols-2 @4xl/shortcuts:grid-cols-3',
    empty: 'mt-4',
    section: 'min-w-0',
    sectionTitle: 'mb-1 text-xs font-medium text-surface',
    list: 'flex flex-col',
    row: 'flex min-h-7 items-center justify-between gap-3 border-b border-border py-1 last:border-b-0',
    label: 'min-w-0 truncate text-xs text-muted',
    keys: 'flex shrink-0 items-center gap-1',
    separator: '-ml-0.5 text-xs text-muted',
    gesture: 'text-xs text-muted',
    key: 'inline-flex min-w-5 items-center justify-center rounded-md bg-panel-field px-1.5 py-0.5 font-mono text-[11px] leading-none text-surface'
  }
} as const
