/**
 * The composer's "Let it cook" control: an icon while it is off, a raised pill naming what the
 * next messages ask for while it is on, and a popover choosing the mode, count, and axis.
 */
export default {
  slots: {
    trigger: [
      'flex h-7 min-w-7 cursor-pointer items-center justify-center gap-1 rounded-lg border border-transparent px-1.5 text-muted outline-none',
      'hover:bg-hover hover:text-surface focus-visible:border-panel-focus',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
      'data-[state=on]:bg-raised data-[state=on]:text-surface data-[state=on]:shadow-xs'
    ],
    triggerIcon: 'size-4 shrink-0 in-data-[state=on]:text-agent',
    triggerLabel: 'text-[11px] font-medium whitespace-nowrap tabular-nums',
    content: 'flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-3 p-3',
    header: 'flex flex-col gap-0.5',
    title: 'flex items-center gap-1.5 text-xs font-medium text-surface',
    titleIcon: 'size-3.5 text-agent',
    description: 'text-[11px] leading-snug text-muted',
    field: 'flex flex-col gap-1.5',
    label: 'text-[11px] text-muted'
  }
} as const
