/** A side list of places, drawn like the Settings dialog's sections: groups split by rules, headings, 28px rows with icons. */
export default {
  slots: {
    root: 'flex h-full shrink-0 flex-col overflow-y-auto bg-panel',
    group: 'flex flex-col gap-0.5 border-t border-border p-2 first:border-t-0',
    header: 'flex h-7 shrink-0 items-center justify-between pr-0.5 pl-2',
    title: 'text-[11px] font-semibold text-muted',
    actions: 'flex items-center gap-0.5',
    items: 'flex flex-col gap-0.5',
    // The place shown is a selected row, as in the layer tree; its quiet text turns full strength
    // on the tint.
    item: 'group flex h-7 w-full shrink-0 cursor-pointer items-center gap-2 rounded-field border-none bg-transparent px-2 text-left text-xs text-muted outline-none transition-colors hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-accent/50 data-[active=true]:bg-panel-selected-muted data-[active=true]:text-surface',
    icon: 'size-3.5 shrink-0',
    label: 'min-w-0 flex-1 truncate',
    trailing:
      'flex shrink-0 items-center gap-1.5 text-[11px] text-muted tabular-nums group-data-[active=true]:text-surface',
    attention: 'size-3.5 text-warning'
  },
  variants: {
    surface: {
      /** Edge to edge beside its page, with a rule between them, as the Cloud console has it. */
      flush: { root: 'w-64 border-r border-border' },
      /** A card inset on the window backdrop, as Home's sidebar beside its documents. */
      card: { root: 'w-60 rounded-card border border-border elevation-card' }
    }
  },
  defaultVariants: { surface: 'flush' as const }
} as const
