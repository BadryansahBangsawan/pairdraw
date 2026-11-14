/** Home's places as tabs over its documents, with the remaining places in a menu at their end. */
export default {
  slots: {
    root: 'mb-4 flex flex-wrap items-center gap-2',
    tabs: 'flex items-center gap-1',
    tab: 'rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none data-[active=true]:bg-hover data-[active=true]:font-medium data-[active=true]:text-surface',
    more: 'ms-auto flex items-center gap-1.5'
  }
} as const
