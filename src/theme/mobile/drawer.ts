/**
 * The mobile bottom sheet: a grabber, a row of panel tabs, and the panel it opens. Closed, the
 * grabber and tabs stay 56px tall, which the mobile toolbar's offset above it assumes.
 */
export default {
  slots: {
    root: 'fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col rounded-t-dialog border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] elevation-dialog',
    tabs: 'flex min-h-0 flex-1 flex-col',
    header: 'flex shrink-0 flex-col',
    grabber: 'flex w-full justify-center pt-2',
    grabberBar: 'h-1 w-8 rounded-full bg-muted/40',
    list: 'flex w-full items-center gap-1 px-2 py-1.5',
    // The open panel's tab is a raised pill, edged so it shows on the light theme's white sheet.
    // Its edge and the focus ring share the ring, so focus is restated for the active tab.
    trigger:
      'flex h-8 cursor-pointer items-center justify-center rounded-lg px-3 text-muted transition-colors outline-none select-none active:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=active]:bg-raised data-[state=active]:text-surface data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border data-[state=active]:focus-visible:ring-panel-focus',
    triggerIcon: 'size-4',
    spacer: 'flex-1',
    content: 'min-h-0 flex-1 overflow-y-auto',
    page: 'mt-0 h-full data-[state=inactive]:hidden',
    pageBody: 'flex h-full flex-col',
    divider: 'border-t border-border',
    heading: 'shrink-0 px-3.5 py-2 text-xs font-medium text-surface',
    layers: 'min-h-0 flex-1'
  }
} as const
