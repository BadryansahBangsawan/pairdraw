/**
 * Tabs in two shapes. Horizontal tabs are a segmented control: a recessed track whose active tab
 * is a raised pill. Vertical tabs are a side list of rows on a quieter surface, the active row a
 * raised pill too. Each shape keeps to its own `data-[orientation]` classes. Muted text a tab
 * nests, such as a count, turns full strength on the pill, where muted falls short of AA.
 */
export default {
  slots: {
    root: 'flex min-h-0 min-w-0 flex-1 flex-col data-[orientation=vertical]:flex-row',
    list: [
      'flex min-w-0 shrink-0 overflow-x-auto',
      'data-[orientation=horizontal]:m-2 data-[orientation=horizontal]:gap-0.5 data-[orientation=horizontal]:rounded-field data-[orientation=horizontal]:bg-panel-field data-[orientation=horizontal]:p-0.5',
      'data-[orientation=vertical]:w-40 data-[orientation=vertical]:flex-col data-[orientation=vertical]:gap-0.5 data-[orientation=vertical]:border-r data-[orientation=vertical]:border-border data-[orientation=vertical]:bg-panel-secondary data-[orientation=vertical]:p-2'
    ],
    trigger: [
      'flex shrink-0 cursor-pointer items-center gap-2 text-left text-xs text-muted transition-colors hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-50 data-[state=active]:bg-raised data-[state=active]:text-surface data-[state=active]:shadow-xs data-[state=active]:[&_.text-muted]:text-surface',
      'data-[orientation=horizontal]:h-6 data-[orientation=horizontal]:grow data-[orientation=horizontal]:justify-center data-[orientation=horizontal]:rounded-[5px] data-[orientation=horizontal]:px-2.5',
      'data-[orientation=vertical]:min-h-7 data-[orientation=vertical]:rounded-field data-[orientation=vertical]:px-2 data-[orientation=vertical]:py-1.5 data-[orientation=vertical]:data-[state=inactive]:hover:bg-hover',
      // In light the raised pill is barely whiter than the side list, so a ring marks the active
      // row. It is an inset ring, so the focus ring still draws around it.
      'data-[orientation=vertical]:data-[state=active]:inset-ring data-[orientation=vertical]:data-[state=active]:inset-ring-border'
    ],
    // A group's name above its tabs, styled as the side list's group titles (list/side-list.ts).
    heading: 'px-2 pt-3 pb-1 text-[11px] font-semibold text-muted select-none first:pt-1',
    icon: 'flex size-3.5 shrink-0 items-center justify-center',
    label: 'min-w-0',
    trailing: 'ml-auto shrink-0',
    content:
      'min-h-0 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50'
  }
} as const
