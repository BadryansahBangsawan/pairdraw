export default {
  slots: {
    root: 'flex h-[min(70vh,32rem)] flex-col overflow-hidden',
    searchWrapper: 'flex h-12 shrink-0 items-center border-b border-border px-2',
    search:
      'h-8 flex-1 rounded-none border-0 bg-transparent px-0 text-[13px] outline-none placeholder:text-muted',
    back: 'px-3 pt-2 text-xs text-muted',
    content:
      'min-h-0 flex-1 overflow-y-auto p-1.5 [scrollbar-color:theme(colors.muted)_transparent]',
    label: 'px-2 pt-2 pb-1 text-[11px] font-medium text-muted',
    group: 'mb-1 last:mb-0',
    item: 'mx-0 flex h-8 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-[13px] leading-6 text-surface outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-muted data-[disabled]:opacity-55 data-[highlighted]:bg-hover',
    itemIcon: 'flex size-6 shrink-0 items-center justify-center text-muted',
    itemLabel: 'min-w-0 flex-1 truncate',
    shortcut: 'flex shrink-0 items-center gap-1 text-xs text-muted',
    key: 'inline-flex min-w-5 items-center justify-center rounded-md bg-panel-field px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted'
  }
} as const
