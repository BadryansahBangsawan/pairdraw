export const designCheckTheme = {
  slots: {
    root: 'flex min-h-0 flex-1 flex-col',
    toolbar: 'flex shrink-0 flex-col gap-2 border-b border-border px-3.5 py-2.5',
    toolbarRow: 'flex min-w-0 items-center gap-1',
    filters: 'flex min-w-0 flex-1 items-center gap-0.5',
    filter:
      'flex h-6 cursor-pointer items-center gap-1 rounded px-1.5 text-[11px] text-surface tabular-nums outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=off]:text-muted data-[state=off]:[&_svg]:opacity-50',
    list: 'scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-2',
    status: 'px-3.5 py-2 text-[11px] text-muted',
    // Group slots override the matching AppCollapsible slots.
    group: 'group/issue border-b border-border/60 last:border-b-0',
    groupHeader: 'group/header relative h-8 gap-0 pr-2 pl-1.5',
    groupTrigger:
      'h-7 cursor-pointer gap-1.5 rounded pr-1 text-[11px] focus-visible:ring-1 focus-visible:ring-panel-focus',
    chevron: 'size-3 text-muted',
    groupLabel: 'flex min-w-0 flex-1 items-center gap-1.5',
    groupTitle: 'block min-w-0 truncate font-semibold',
    groupCount:
      'ml-auto shrink-0 pr-1 text-muted tabular-nums group-focus-within/header:invisible group-hover/header:invisible group-data-[menu-open]/issue:invisible',
    groupActions:
      'invisible absolute inset-y-0 right-1.5 flex items-center gap-0.5 group-focus-within/header:visible group-hover/header:visible group-data-[menu-open]/issue:visible',
    rows: 'pb-1',
    rowItem: 'group/row relative',
    row: 'flex h-7 w-full cursor-default items-center gap-2 pr-2 pl-7 text-left text-[11px] text-surface outline-none hover:bg-hover focus-visible:bg-hover data-[selected]:bg-panel-selected-muted data-[missing]:text-muted',
    rowIcon: 'size-3 shrink-0 text-muted',
    rowName: 'min-w-0 flex-1 truncate',
    // Quiet text turns full strength on a selected row's tint, where the muted color reads too faint.
    rowTag: 'shrink-0 text-[10px] text-muted in-data-[selected]:text-surface',
    rowDetail:
      'flex max-w-[50%] min-w-0 shrink items-center gap-1.5 text-muted tabular-nums in-data-[selected]:text-surface',
    rowDetailText: 'truncate',
    rowAction:
      'absolute top-1/2 right-1.5 hidden h-5 -translate-y-1/2 cursor-pointer items-center rounded bg-panel px-1.5 text-primary ring-1 ring-border outline-none group-focus-within/row:flex group-hover/row:flex hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus',
    contrastSwatch:
      'flex h-3.5 shrink-0 items-center rounded-[3px] px-[3px] text-[9px] leading-none font-semibold shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]',
    swatch: 'size-2.5 shrink-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]',
    more: 'mb-1 ml-6'
  }
} as const
