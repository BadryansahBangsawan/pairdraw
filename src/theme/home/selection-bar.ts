/**
 * The bar over a Home list while documents in it are selected: how many, then what can be done to
 * all of them, then Select all and a button that clears the selection.
 */
export default {
  slots: {
    root: 'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel-secondary px-3 py-2',
    count: 'mr-auto text-xs font-medium text-surface tabular-nums',
    actions: 'flex flex-wrap items-center gap-1.5'
  }
} as const
