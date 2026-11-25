/** The frames one reply changed, as small before and after renders, under its text. */
export default {
  slots: {
    root: 'space-y-2 rounded-xl border border-border bg-panel-secondary p-2.5',
    title: 'text-[11px] font-medium text-muted',
    grid: 'flex gap-2',
    figure: 'min-w-0 flex-1 space-y-1',
    caption: 'truncate text-[10px] text-muted',
    frame:
      'relative flex w-full flex-col overflow-hidden rounded-md border border-border bg-panel disabled:cursor-not-allowed',
    image: 'block h-auto w-full',
    divider: 'block h-px w-full bg-border',
    placeholder: 'grid aspect-video w-full place-items-center text-[10px] text-muted',
    widths: 'flex gap-1',
    width: 'h-8 min-w-0 flex-1 overflow-hidden rounded border border-border bg-panel',
    widthImage: 'size-full object-cover object-top',
    note: 'text-[10px] text-muted'
  }
} as const
