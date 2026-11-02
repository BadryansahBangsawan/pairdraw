/**
 * A list of documents on the home tab, from recent files, the storage bucket, or a Cloud
 * workspace: a heading with its actions, then cards in a grid, rows in a list, or an empty state.
 * Columns follow the documents card's width (`@container/home` in `home/layout.ts`).
 */
export default {
  slots: {
    section: 'flex min-w-0 flex-col gap-4',
    header: 'flex flex-wrap items-start gap-x-4 gap-y-2',
    heading: 'min-w-0 flex-1 basis-56',
    titleRow: 'flex items-center gap-2',
    title: 'truncate text-sm font-semibold text-surface',
    description: 'mt-0.5 text-xs text-pretty text-muted',
    details:
      'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs whitespace-nowrap text-muted',
    actions: 'ml-auto flex shrink-0 items-center gap-1',
    grid: 'grid grid-cols-1 gap-x-4 gap-y-5 @md/home:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
    list: 'overflow-hidden rounded-xl border border-border',
    empty:
      'rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted @2xl/home:py-8',
    emptyTitle: 'font-medium text-surface',
    emptyDescription: 'mt-1',
    emptyAction: 'mt-3',
    error: 'rounded-xl border border-error-border bg-error-bg px-4 py-6 text-center',
    errorText: 'text-xs text-error',
    errorAction: 'mt-3',
    // A loading card in the shape of a document card: preview, name, and date.
    skeleton: 'min-w-0 rounded-card border border-border p-1.5',
    skeletonPreview: 'aspect-[4/3] h-auto w-full rounded-lg',
    skeletonName: 'mx-1.5 mt-2.5 w-2/3',
    skeletonMeta: 'mx-1.5 mt-1.5 mb-1.5 h-2 w-1/3'
  }
} as const
